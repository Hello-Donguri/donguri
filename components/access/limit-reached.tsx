import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FREE_GRAMMAR_LIMIT, FREE_VOCAB_LIMIT, GUEST_ITEM_LIMIT, type Allowance } from "@/lib/access";
import type { TFunction } from "@/lib/i18n/translate";

// Shown in place of the learn session when someone's free allowance has
// run out but there's more to learn (see getLearnQueueForCourse). A guest
// is asked to sign up — which keeps their progress and opens up the free
// account's allowance — and a free account to become a member. Reviews of
// what they've learnt stay open either way, so both point there too.
export function LimitReached({
  allowance,
  courseSlug,
  priceLabel,
  t,
}: {
  allowance: Allowance;
  courseSlug: string;
  priceLabel: string;
  t: TFunction;
}) {
  const isGuest = allowance.tier === "guest";
  const learnt = allowance.used.vocab + allowance.used.grammar;

  const perks = isGuest
    ? [
        t("limit.guest_perk_save", "Your progress is saved"),
        t("limit.guest_perk_allowance", "{{vocab}} words and {{grammar}} grammar points free", {
          vocab: FREE_VOCAB_LIMIT,
          grammar: FREE_GRAMMAR_LIMIT,
        }),
        t("limit.guest_perk_devices", "Pick up on your phone or computer"),
      ]
    : [
        t("limit.member_perk_unlimited", "Every word and grammar point, no limits"),
        t("limit.member_perk_challenge", "Daily chat challenges with Charles Duck"),
        t("limit.member_perk_cancel", "Cancel anytime"),
      ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center rounded-4xl border border-card-border bg-raised px-6 pt-10 pb-8 text-center shadow-sm sm:px-10">
      <Image src="/images/mascot.png" alt="" width={1224} height={1285} className="profile-bob h-28 w-auto" />

      <h1 className="mt-5 font-nunito text-2xl font-extrabold text-sumi text-balance sm:text-3xl">
        {isGuest
          ? t("limit.guest_title", "You've learnt your first {{count}} words!", { count: GUEST_ITEM_LIMIT })
          : t("limit.free_title", "You've used your free words")}
      </h1>
      <p className="mt-3 max-w-md text-sumi-soft text-pretty">
        {isGuest
          ? t(
              "limit.guest_body",
              "Sign up free to save what you've learnt and keep going. It only takes a minute.",
            )
          : t(
              "limit.free_body",
              "You've learnt {{count}} words and grammar points for free. Become a member for {{price}} to keep learning new ones.",
              { count: learnt, price: priceLabel },
            )}
      </p>

      <ul className="mt-6 flex flex-col gap-2 text-left text-sm text-sumi">
        {perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-matcha text-washi" aria-hidden>
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            {perk}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {isGuest ? (
          <Button href="/signup" size="lg" className="h-13 px-8">
            {t("limit.guest_cta", "Sign up free")}
          </Button>
        ) : (
          <Button href="/dashboard/billing" size="lg" className="h-13 px-8">
            {t("limit.free_cta", "Become a member")}
          </Button>
        )}
        {/* Reviews need an account (the course page shows them locked for
            guests), so only free accounts are pointed there. */}
        {!isGuest && (
          <Button href={`/dashboard/courses/${courseSlug}/review`} variant="outline" size="lg" className="h-13 px-8">
            {t("limit.review_cta", "Review what you've learnt")}
          </Button>
        )}
      </div>

      {isGuest && (
        <p className="mt-5 text-sm text-sumi-soft">
          {t("limit.have_account", "Already have an account?")}{" "}
          <Link href="/login" className="font-semibold text-ai-dark underline-offset-2 hover:underline">
            {t("nav.log_in", "Log in")}
          </Link>
        </p>
      )}
    </div>
  );
}
