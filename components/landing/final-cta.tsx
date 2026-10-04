import Image from "next/image";
import { StartFreeButton } from "@/components/landing/start-free-button";
import type { TFunction } from "@/lib/i18n/translate";

export function FinalCta({ t }: { t: TFunction }) {
  return (
    <section className="border-t border-card-border bg-washi-soft">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center sm:py-24">
        <Image
          src="/images/mascot.png"
          alt=""
          width={1224}
          height={1285}
          sizes="120px"
          className="h-auto w-full max-w-27.5 object-contain"
        />

        <h2 className="mt-6 font-nunito text-3xl font-extrabold tracking-tight text-sumi text-balance sm:text-4xl">
          {t("home.final.heading", "Your first three words are five minutes away.")}
        </h2>
        <p className="mt-3 max-w-md text-lg text-sumi-soft text-pretty">
          {t(
            "home.final.subtext_free",
            "Try your first words right now, no sign-up needed. Donguri will have your first lesson ready.",
          )}
        </p>

        <div className="mt-8">
          <StartFreeButton label={t("home.final.cta_start", "Start learning free")} className="px-10" />
        </div>
        <p className="mt-3 text-xs text-sumi-soft">
          {t("home.final.microcopy_free", "40 words and 20 grammar points free with an account.")}
        </p>
      </div>
    </section>
  );
}
