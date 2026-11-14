import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";
import { FREE_GRAMMAR_LIMIT, FREE_VOCAB_LIMIT } from "@/lib/access";

// Over the course page once a guest has learnt the starter words (see
// lib/access.ts): to carry on they have to sign up, or log in — there's
// no closing it.
export async function GuestLimitModal() {
  const { t } = await getTranslator();

  const perks = [
    t("limit.guest_perk_save", "Your progress is saved"),
    t("limit.guest_perk_allowance", "{{vocab}} words and {{grammar}} grammar points free", {
      vocab: FREE_VOCAB_LIMIT,
      grammar: FREE_GRAMMAR_LIMIT,
    }),
    t("limit.guest_perk_devices", "Pick up on your phone or computer"),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-limit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-sumi/60 p-4 backdrop-blur-[3px]"
    >
      <div className="relative flex w-full max-w-md flex-col items-center rounded-3xl bg-raised px-6 pt-9 pb-7 text-center shadow-2xl sm:px-8">
        <Image src="/images/mascot.png" alt="" width={1224} height={1285} className="profile-bob h-24 w-auto" />

        <h2 id="guest-limit-title" className="mt-4 font-nunito text-2xl font-extrabold text-sumi text-balance">
          {t("guest_banner.nearly_out_title", "Sign up to get more words")}
        </h2>
        <p className="mt-2 text-sm text-sumi-soft text-pretty">
          {t(
            "guest_limit_modal.starter_body",
            "Nice work on your first three words! Create a free account to keep them and carry on learning.",
          )}
        </p>

        <ul className="mt-5 flex flex-col gap-2 text-left text-sm text-sumi">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-matcha text-washi" aria-hidden>
                <Check className="h-3 w-3" strokeWidth={3.5} />
              </span>
              {perk}
            </li>
          ))}
        </ul>

        <Button href="/signup" size="lg" fullWidth className="mt-7">
          {t("limit.guest_cta", "Sign up free")}
        </Button>
        <p className="mt-4 text-xs text-sumi-soft">
          {t("limit.have_account", "Already have an account?")}{" "}
          <Link href="/login" className="font-semibold text-ai-dark underline-offset-2 hover:underline">
            {t("nav.log_in", "Log in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
