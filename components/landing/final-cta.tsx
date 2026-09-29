import Image from "next/image";
import { Button } from "@/components/ui/button";
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
            "home.final.subtext",
            "Start your free trial today. Donguri will have your first lesson ready.",
          )}
        </p>

        <Button href="/signup" size="lg" className="mt-8 h-14 px-10 text-base">
          {t("home.final.cta", "Start your free trial")}
        </Button>
        <p className="mt-3 text-xs text-sumi-soft">
          {t("home.final.microcopy", "14 days free. Cancel anytime.")}
        </p>
      </div>
    </section>
  );
}
