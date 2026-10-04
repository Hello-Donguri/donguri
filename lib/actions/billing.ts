"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireProfile, requireRegisteredProfile } from "@/lib/dal";
import { getLocale } from "@/lib/i18n/get-locale";
import { prisma } from "@/lib/prisma";
import { getMembershipPrice, stripe } from "@/lib/stripe";

// Absolute app URL for Stripe's redirect URLs. NEXT_PUBLIC_SITE_URL may be
// set without a scheme (e.g. "localhost:3000"), which Stripe rejects, so
// one is added: http for localhost, https otherwise.
async function getAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const headersList = await headers();
  const host =
    configured ?? headersList.get("x-forwarded-host") ?? headersList.get("host");
  if (!host) throw new Error("Could not determine the application URL.");
  if (/^https?:\/\//.test(host)) return host;
  return `${host.includes("localhost") ? "http" : "https"}://${host}`;
}

// The user's Stripe customer, created (and linked in `subscriptions`) on
// their first Checkout. The idempotency key stops a double-click creating
// two customers for one user.
async function getOrCreateCustomer(profile: {
  id: string;
  email: string;
  full_name: string | null;
}) {
  const existing = await prisma.subscription.findUnique({
    where: { userId: profile.id },
    select: { stripeCustomerId: true, trialUsed: true },
  });
  if (existing) return existing;

  const customer = await stripe().customers.create(
    {
      email: profile.email,
      name: profile.full_name ?? undefined,
      metadata: { userId: profile.id },
    },
    { idempotencyKey: `donguri-customer-${profile.id}` },
  );

  return prisma.subscription.upsert({
    where: { userId: profile.id },
    create: { userId: profile.id, stripeCustomerId: customer.id },
    update: {},
    select: { stripeCustomerId: true, trialUsed: true },
  });
}

// Sends the user to Stripe Checkout for the membership — charged straight
// away, no trial: the free allowance (see lib/access.ts) is how people try
// Donguri now. Guests make an account first.
export async function startCheckout(): Promise<void> {
  const profile = await requireRegisteredProfile();

  if (profile.subscription && profile.hasAccess) {
    redirect("/dashboard/billing");
  }

  const [customer, price, appUrl, locale] = await Promise.all([
    getOrCreateCustomer(profile),
    getMembershipPrice(),
    getAppUrl(),
    getLocale(),
  ]);

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customer.stripeCustomerId,
    client_reference_id: profile.id,
    line_items: [{ price: price.id, quantity: 1 }],
    payment_method_collection: "always",
    subscription_data: {
      metadata: { userId: profile.id },
    },
    allow_promotion_codes: true,
    locale: locale === "ja" ? "ja" : "auto",
    success_url: `${appUrl}/dashboard/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
  });

  if (!session.url) throw new Error("Stripe Checkout did not return a URL");
  redirect(session.url);
}

// Sends the user to Stripe's Customer Portal: update their card, see and
// download invoices, or cancel (at the end of the period).
export async function openBillingPortal(): Promise<void> {
  const profile = await requireProfile();

  const row = await prisma.subscription.findUnique({
    where: { userId: profile.id },
    select: { stripeCustomerId: true },
  });
  if (!row) redirect("/dashboard/billing");

  const session = await stripe().billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: `${await getAppUrl()}/dashboard/billing`,
  });

  redirect(session.url);
}
