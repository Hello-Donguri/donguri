import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import {
  BookOpen,
  CalendarDays,
  Check,
  Languages,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import { cacheLife } from "next/cache";
import { requireRegisteredProfile } from "@/lib/dal";
import { getMembershipDisplayPrice } from "@/lib/billing";
import { openBillingPortal, startCheckout } from "@/lib/actions/billing";
import { getTranslator } from "@/lib/i18n/server";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { BillingActionButton } from "@/components/billing/billing-action-button";
import DonguriMascot from "@/components/icons/DonguriMascot";
import { Eyebrow } from "@/components/landing/section";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Membership — Donguri",
};

type PageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

// Private cache scope, like loadCourseHome on the course page: the session
// read checks token expiry against `Date.now()`, which Cache Components only
// allows inside a cache scope during a (runtime) prerender. Arriving back
// from Checkout or the Customer Portal is a full page load, so this never
// serves a stale subscription after a change made on Stripe.
async function loadBilling() {
  "use cache: private";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  const [profile, price] = await Promise.all([
    requireRegisteredProfile(),
    getMembershipDisplayPrice(),
  ]);
  return { profile, price };
}

// Where free accounts come to become members (see lib/access.ts — the
// learn page's limit screen and the locked daily challenge link here), and
// where members manage billing. Reachable without a subscription, like
// profile and settings; guests are sent to sign up first.
export default async function BillingPage({ searchParams }: PageProps) {
  const [{ profile, price }, { t, locale }] = await Promise.all([
    loadBilling(),
    getTranslator(),
  ]);

  const subscription = profile.subscription;
  const status = subscription?.status ?? null;
  const priceLabel = `${new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency.toUpperCase(),
  }).format(
    price.amount,
  )}/${price.interval === "month" ? t("billing.per_month", "month") : price.interval}`;
  const formatDate = (date: Date | null) =>
    date
      ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date)
      : "";
  // Had a membership before (now ended) — welcomed back rather than
  // pitched to.
  const returning = Boolean(subscription?.status);

  // Tile and chip classes written out in full so Tailwind finds them.
  const features = [
    {
      icon: BookOpen,
      title: t("billing.feature_courses", "Every course, deck and lesson"),
      tile: "border-ai/20 bg-ai-soft/50",
      chip: "bg-ai text-washi",
    },
    {
      icon: MessageCircle,
      title: t(
        "billing.feature_challenge",
        "Daily chat challenges with Charles Duck",
      ),
      tile: "border-matcha/20 bg-matcha-soft/50",
      chip: "bg-matcha text-washi",
    },
    {
      icon: Languages,
      title: t(
        "billing.feature_feedback",
        "Feedback on your English in Japanese and English",
      ),
      tile: "border-sakura/20 bg-sakura-soft/50",
      chip: "bg-sakura text-washi",
    },
    {
      icon: Repeat2,
      title: t(
        "billing.feature_reviews",
        "Spaced-repetition reviews so words stick",
      ),
      tile: "border-kin/30 bg-kin/10",
      chip: "bg-kin text-ink-on-light",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {profile.hasAccess && (
        <div>
          <PageTitle>{t("billing.heading", "Membership")}</PageTitle>
          <PageSubtitle>
            {t(
              "billing.subtitle",
              "Your Donguri membership, payment details and invoices.",
            )}
          </PageSubtitle>
        </div>
      )}

      <Suspense fallback={null}>
        <CheckoutNotice
          searchParams={searchParams}
          hasAccess={profile.hasAccess}
          isTrial={status === "trialing"}
        />
      </Suspense>

      {profile.hasAccess && subscription ? (
        <section className="relative max-w-2xl">
          <div
            aria-hidden
            className="absolute -inset-2 -z-10 -rotate-1 rounded-[2.25rem] bg-matcha-soft"
          />
          <div className="flex flex-col gap-5 rounded-4xl border border-card-border bg-raised p-6 shadow-lg sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-acorn-soft p-2">
                  <DonguriMascot
                    className="profile-bob h-full w-auto"
                    aria-hidden
                  />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold text-sumi">
                    {t("billing.plan_name", "Donguri Membership")}
                  </h2>
                  <p className="font-nunito text-sm font-bold text-matcha-dark">
                    {priceLabel}
                  </p>
                </div>
              </div>
              <StatusBadge
                status={status}
                cancelling={subscription.cancelAtPeriodEnd}
                t={t}
              />
            </div>

            <div
              className={cn(
                "flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm text-sumi",
                status === "past_due" ? "bg-shu/10" : "bg-washi-soft",
              )}
            >
              <CalendarDays
                aria-hidden
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  status === "past_due" ? "text-shu" : "text-acorn",
                )}
                strokeWidth={2.25}
              />
              <p>
                {status === "trialing"
                  ? subscription.cancelAtPeriodEnd
                    ? t(
                        "billing.trial_cancelling",
                        "Your free trial ends on {{date}} and won't renew. You won't be charged.",
                        {
                          date: formatDate(subscription.trialEnd),
                        },
                      )
                    : t(
                        "billing.trial_active",
                        "Your free trial ends on {{date}}. After that you'll be charged {{price}} unless you cancel before then.",
                        {
                          date: formatDate(subscription.trialEnd),
                          price: priceLabel,
                        },
                      )
                  : status === "past_due"
                    ? t(
                        "billing.past_due",
                        "Your last payment didn't go through. Please update your payment method to keep your access.",
                      )
                    : subscription.cancelAtPeriodEnd
                      ? t(
                          "billing.cancelling",
                          "Your membership ends on {{date}} and won't renew.",
                          {
                            date: formatDate(subscription.currentPeriodEnd),
                          },
                        )
                      : t(
                          "billing.renews",
                          "Your membership renews on {{date}}.",
                          {
                            date: formatDate(subscription.currentPeriodEnd),
                          },
                        )}
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t border-dashed border-card-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-sumi-soft">
                {t(
                  "billing.portal_hint",
                  "Update your card, download invoices or cancel on Stripe's secure page.",
                )}
              </p>
              <BillingActionButton
                action={openBillingPortal}
                variant={status === "past_due" ? "primary" : "outline"}
                pendingText={t("billing.opening", "Opening…")}
              >
                {status === "past_due"
                  ? t("billing.update_payment", "Update payment method")
                  : t("billing.manage", "Manage billing")}
              </BillingActionButton>
            </div>
          </div>
        </section>
      ) : profile.hasAccess ? (
        <p className="flex max-w-2xl items-center gap-3 rounded-2xl border border-card-border bg-acorn-soft px-5 py-4 text-sm text-sumi">
          <span className="text-2xl" aria-hidden>
            🌰
          </span>
          {t(
            "billing.admin_access",
            "You have full access as an admin — no membership needed.",
          )}
        </p>
      ) : (
        <section className="relative mx-auto w-full max-w-4xl">
          <div
            aria-hidden
            className="absolute -inset-2 -z-10 rotate-1 rounded-[2.25rem] bg-acorn-soft"
          />
          <div className="overflow-hidden rounded-4xl border border-card-border bg-raised shadow-lg">
            <div className="relative bg-matcha-soft px-6 pt-10 pb-10 sm:px-10">
              <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
                <DonguriMascot
                  className="profile-bob mb-4 h-24 w-auto sm:h-28"
                  aria-hidden
                />
                <Eyebrow accent="matcha">
                  {t("billing.plan_name", "Donguri Membership")}
                </Eyebrow>

                <h2 className="mt-4 font-nunito text-4xl font-black leading-[1.06] tracking-tight text-sumi text-balance sm:text-5xl">
                  {returning
                    ? t(
                        "billing.resubscribe_title",
                        "Pick up where you left off",
                      )
                    : t("billing.join_title", "Get Donguri Pro")}
                </h2>

                <p className="mt-4 max-w-xl text-lg text-sumi-soft text-pretty">
                  {returning
                    ? t(
                        "billing.resubscribe_body",
                        "Your membership has ended. Resubscribe to get back to your courses — your progress is saved.",
                      )
                    : t(
                        "billing.join_body",
                        "Learn every word and grammar point, and chat with Charles Duck every day. {{price}}, and you can cancel anytime.",
                        {
                          price: priceLabel,
                        },
                      )}
                </p>
              </div>

              {/* Charles peeks up from the bottom corner of the band. */}
              <Image
                src="/images/charles.webp"
                alt=""
                width={1254}
                height={1254}
                className="absolute right-5 -bottom-2 hidden h-24 w-auto -scale-x-100 lg:block"
              />
              <Image
                src="/images/donguri-peering.webp"
                alt=""
                width={434}
                height={834}
                className="absolute left-8 -bottom-4 hidden h-32 w-auto -rotate-6 lg:block"
              />
            </div>

            <ul className="grid grid-cols-1 gap-3 px-6 pt-7 sm:grid-cols-2 sm:px-10">
              {features.map((feature) => (
                <li
                  key={feature.title}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 font-nunito text-base font-bold leading-tight text-sumi shadow-sm",
                    feature.tile,
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                      feature.chip,
                    )}
                  >
                    <feature.icon
                      aria-hidden
                      className="h-5 w-5"
                      strokeWidth={2.25}
                    />
                  </span>
                  {feature.title}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col items-center border-t border-dashed border-card-border px-6 pt-7 pb-8 sm:px-10">
              <div className="w-full sm:w-auto">
                <BillingActionButton
                  action={startCheckout}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  className="h-14 px-8 text-base"
                  pendingText={t(
                    "billing.redirecting",
                    "Taking you to secure checkout…",
                  )}
                >
                  {t("billing.subscribe", "Subscribe for {{price}}", {
                    price: priceLabel,
                  })}
                </BillingActionButton>
              </div>

              <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-sumi-soft">
                {[
                  t("home.hero.point_cancel", "Cancel anytime"),
                  t("home.hero.point_japanese", "Explained in Japanese"),
                  t("billing.point_stripe", "Secure payment with Stripe"),
                ].map((point) => (
                  <li key={point} className="inline-flex items-center gap-1.5">
                    <Check
                      aria-hidden
                      className="h-4 w-4 text-matcha"
                      strokeWidth={3}
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  cancelling,
  t,
}: {
  status: string | null;
  cancelling: boolean;
  t: Awaited<ReturnType<typeof getTranslator>>["t"];
}) {
  const [label, tone] =
    status === "trialing"
      ? [t("billing.status_trial", "Free trial"), "bg-kin/20 text-sumi"]
      : status === "past_due"
        ? [t("billing.status_past_due", "Payment failed"), "bg-shu/15 text-shu"]
        : cancelling
          ? [
              t("billing.status_cancelling", "Cancelling"),
              "bg-washi-soft text-sumi-soft",
            ]
          : [
              t("billing.status_active", "Active"),
              "bg-matcha-soft text-matcha-dark",
            ];

  return (
    <span className={cn("rounded-full px-3.5 py-1.5 text-xs font-bold", tone)}>
      {label}
    </span>
  );
}

// The one-off banners after Stripe Checkout (?checkout=success from
// /dashboard/billing/return, which has already synced; ?checkout=cancelled
// from Checkout's cancel link). Reads the URL behind its own Suspense
// boundary so the rest of the page doesn't wait on it.
async function CheckoutNotice({
  searchParams,
  hasAccess,
  isTrial,
}: {
  searchParams: PageProps["searchParams"];
  hasAccess: boolean;
  isTrial: boolean;
}) {
  const [{ checkout }, { t }] = await Promise.all([
    searchParams,
    getTranslator(),
  ]);
  const justStarted = checkout === "success" && hasAccess;

  return (
    <>
      {justStarted && (
        <div className="flex max-w-2xl flex-col gap-4 rounded-3xl border border-matcha/40 bg-matcha-soft p-5 sm:flex-row sm:items-center">
          <DonguriMascot
            className="profile-bob h-16 w-auto shrink-0 self-start sm:self-center"
            aria-hidden
          />
          <div className="flex-1">
            <p className="font-nunito text-lg font-extrabold text-sumi">
              {isTrial
                ? t("billing.welcome_trial", "Your free trial has started 🎉")
                : t("billing.welcome_member", "Welcome to Donguri 🎉")}
            </p>
            <p className="text-sm text-sumi-soft">
              {t(
                "billing.welcome_body",
                "Everything is unlocked — let's get learning.",
              )}
            </p>
          </div>
          <Button variant="secondary" href="/dashboard">
            {t("billing.start_learning", "Start learning")}
          </Button>
        </div>
      )}

      {checkout === "cancelled" && !hasAccess && (
        <p className="max-w-2xl rounded-2xl bg-washi-soft px-5 py-3 text-sm text-sumi-soft">
          {t(
            "billing.checkout_cancelled",
            "Checkout was cancelled — nothing was charged.",
          )}
        </p>
      )}
    </>
  );
}
