"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n/locale-provider";
import { FREE_GRAMMAR_LIMIT, FREE_VOCAB_LIMIT, GUEST_ITEM_LIMIT } from "@/lib/access";
import { cn } from "@/lib/utils";

// The strip under the dashboard header while someone's learning as a guest
// (see lib/access.ts): a gentle reminder to sign up and keep their
// progress — which turns into a clear "sign up for more words" once
// they've used their free words.
export function GuestBanner({ itemsUsed }: { itemsUsed: number }) {
  const t = useTranslations();
  const nearlyOut = itemsUsed >= GUEST_ITEM_LIMIT;

  const title = nearlyOut
    ? t("guest_banner.nearly_out_title", "Sign up to get more words")
    : t("guest_banner.title", "You're learning as a guest");
  const body = nearlyOut
    ? t(
        "guest_banner.nearly_out_body",
        "Create a free account to keep what you've learnt and unlock {{vocab}} words and {{grammar}} grammar points.",
        { vocab: FREE_VOCAB_LIMIT, grammar: FREE_GRAMMAR_LIMIT },
      )
    : t("guest_banner.body", "Sign up free to save your progress.");

  return (
    <div className={cn("border-b border-header-border", nearlyOut ? "bg-kin/30" : "bg-kin/10")}>
      <div className="mx-auto flex max-w-360 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Image src="/images/donguri-peering.webp" alt="" width={434} height={834} className="h-10 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sumi">{title}</p>
            <p className="text-xs text-sumi-soft">{body}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button href="/login" variant="outline" size="sm">
            {t("nav.log_in", "Log in")}
          </Button>
          <Button href="/signup" size="sm">
            {nearlyOut ? t("guest_banner.cta_more", "Sign up free") : t("guest_banner.cta", "Save my progress")}
          </Button>
        </div>
      </div>
    </div>
  );
}
