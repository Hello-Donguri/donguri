"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  LoginFormSchema,
  SignupFormSchema,
  OnboardingFormSchema,
  ForgotPasswordFormSchema,
  ResetPasswordFormSchema,
  type LoginFormState,
  type SignupFormState,
  type OnboardingFormState,
  type ForgotPasswordFormState,
  type ResetPasswordFormState,
} from "@/lib/definitions";
import { getSession, requireUser } from "@/lib/dal";
import { mergeGuestInto, rememberGuestForOAuth } from "@/lib/guest-merge";
import { clearSessionCookies } from "@/lib/supabase/session-cookies";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const getOrigin = async () => {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    // Supabase silently ignores a redirect URL without a scheme and falls
    // back to the project's Site URL — so tolerate "localhost:3000".
    const withScheme = /^https?:\/\//.test(configuredUrl)
      ? configuredUrl
      : `${configuredUrl.includes("localhost") ? "http" : "https"}://${configuredUrl}`;

    return withScheme.replace(/\/$/, "");
  }

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol =
    headersList.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    throw new Error("Could not determine the application URL.");
  }

  return `${protocol}://${host}`;
};

// The id of the guest (anonymous user, see lib/access.ts) currently signed
// in, if any — read before a sign-in replaces their session, so what they
// learnt can be moved onto the account (see lib/guest-merge.ts).
async function currentGuestId(): Promise<string | null> {
  const user = await getSession();
  return user?.is_anonymous ? user.id : null;
}

export async function login(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;
  const guestId = await currentGuestId();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { message: "Invalid email or password." };
  }

  if (guestId) await mergeGuestInto(guestId, data.user.id);

  redirect("/dashboard");
}
export async function signup(
  _state: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const validatedFields = SignupFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    username: formData.get("username"),
    nativeLanguage: formData.get("nativeLanguage"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { firstName, lastName, username, nativeLanguage, email, password } = validatedFields.data;

  // Checked before creating the auth user, so a taken handle doesn't leave
  // behind an account the user then has to finish on /onboarding.
  if (await isUsernameTaken(username)) {
    return { errors: { username: [USERNAME_TAKEN] } };
  }
  const fullName = `${firstName} ${lastName}`.trim();
  const origin = await getOrigin();
  const guestId = await currentGuestId();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return {
        message: "An account with this email already exists.",
      };
    }

    console.error("Supabase signup failed:", error);

    return {
      message: "Something went wrong creating your account.",
    };
  }

  if (!data.user) {
    console.error("Supabase signup succeeded without returning a user.");

    return {
      message: "Something went wrong creating your account.",
    };
  }

  try {
    await prisma.profile.upsert({
      where: {
        id: data.user.id,
      },
      update: {
        email,
        fullName,
        firstName,
        lastName,
        username,
        nativeLanguage,
      },
      create: {
        id: data.user.id,
        email,
        fullName,
        firstName,
        lastName,
        username,
        nativeLanguage,
        role: "user",
      },
    });
  } catch (error) {
    // Someone claimed the handle between the check above and here. The
    // account itself exists, so /onboarding will ask for another one.
    if (isUniqueViolation(error)) {
      return { message: "Your account was created, but that username was just taken — you'll pick another after logging in." };
    }

    console.error("Failed to create Prisma profile:", error);

    return {
      message:
        "Your account was created, but your profile could not be created.",
    };
  }

  // Moved now, while both ids are known — the confirmation link may well
  // be opened on another device, where the guest session doesn't exist.
  if (guestId) await mergeGuestInto(guestId, data.user.id);

  if (data.session) {
    redirect("/dashboard");
  }

  // The guest's session is still in the cookies, for a user that no longer
  // exists — clear it so they land signed out, ready to confirm. Not with
  // signOut(): that also deletes the cookie the confirmation link needs to
  // sign them in (see lib/supabase/session-cookies.ts).
  if (guestId) await clearSessionCookies();

  return {
    message: guestId
      ? "Your progress is saved to your new account. Check your inbox to confirm your email, then log in to carry on."
      : "Check your inbox to confirm your email before logging in.",
  };
}

// Google is a built-in Supabase provider; LINE isn't, so it's registered in
// the Supabase dashboard as a custom OIDC provider (issuer
// https://access.line.me) with the identifier "line" — hence the prefix.
const OAUTH_PROVIDERS = {
  google: "google",
  line: "custom:line",
} as const;

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

export async function signInWithOAuth(provider: OAuthProvider) {
  const origin = await getOrigin();
  const guestId = await currentGuestId();
  if (guestId) await rememberGuestForOAuth(guestId);
  const supabase = await createClient();

  // Runs server-side, so the PKCE code verifier lands in a cookie that
  // app/auth/callback/route.ts reads back when exchanging the code.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: OAUTH_PROVIDERS[provider],
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error || !data.url) {
    console.error(`Supabase ${provider} sign-in failed:`, error);
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

const USERNAME_TAKEN = "That username is taken.";

async function isUsernameTaken(username: string, exceptUserId?: string) {
  const existing = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });

  return existing !== null && existing.id !== exceptUserId;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// Finishes a profile that's missing its username or name — see
// requireProfile in lib/dal.ts, which sends users here. Upserts rather than
// updates, since the auto-create trigger may not have run (see the
// `!profile` case there).
export async function completeOnboarding(
  _state: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await requireUser();
  const existing = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });

  const validatedFields = OnboardingFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    // A username, once set, is fixed — whatever was submitted is ignored.
    username: existing?.username ?? formData.get("username"),
    nativeLanguage: formData.get("nativeLanguage"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { firstName, lastName, username, nativeLanguage } = validatedFields.data;
  const fullName = `${firstName} ${lastName}`;

  if (!existing?.username && (await isUsernameTaken(username, user.id))) {
    return { errors: { username: [USERNAME_TAKEN] } };
  }

  try {
    await prisma.profile.upsert({
      where: { id: user.id },
      update: { firstName, lastName, fullName, username, nativeLanguage },
      create: {
        id: user.id,
        email: user.email ?? "",
        firstName,
        lastName,
        fullName,
        username,
        nativeLanguage,
        role: "user",
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { errors: { username: [USERNAME_TAKEN] } };
    }

    console.error("Failed to complete onboarding:", error);
    return { message: "Something went wrong saving your details." };
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPassword(
  _state: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const validatedFields = ForgotPasswordFormSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email } = validatedFields.data;
  const origin = await getOrigin();
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // Always report success so we don't leak which emails are registered.
  return {
    success: true,
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function resetPassword(
  _state: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const validatedFields = ResetPasswordFormSchema.safeParse({
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: validatedFields.data.password,
  });

  if (error) {
    return {
      message: "Could not update your password. Try the reset link again.",
    };
  }

  redirect("/dashboard");
}
