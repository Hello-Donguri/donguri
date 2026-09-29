import { ArrowRight, MessageSquareQuote, Volume2 } from "lucide-react";
import type { TFunction } from "@/lib/i18n/translate";

// A static stand-in for the real learn card (components/vocab/word-lesson.tsx):
// the same pill, progress, word, meaning and highlighted example, so the
// hero shows what a lesson actually looks like.
export function LessonPreviewCard({ t }: { t: TFunction }) {
  return (
    <div className="relative w-full max-w-sm">
      <div
        aria-hidden="true"
        className="absolute -inset-3 -z-10 rotate-3 rounded-[2.25rem] bg-acorn-soft dark:bg-ai-soft/70"
      />
      <div className="rounded-4xl border border-card-border bg-raised p-6 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <span className="rounded-full bg-ai-soft px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ai-dark">
            {t("home.mock.vocabulary", "Vocabulary")}
          </span>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-sumi-soft">
            {t("home.mock.word_progress", "Word 2 of 3")}
          </p>
          <div aria-hidden="true" className="mt-2 flex gap-2">
            <span className="h-2 w-10 rounded-full bg-ai" />
            <span className="h-2 w-10 rounded-full bg-ai" />
            <span className="h-2 w-10 rounded-full bg-sumi/10" />
          </div>

          <p className="mt-6 font-nunito text-5xl font-extrabold tracking-tight text-sumi">borrow</p>

          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-ai-soft px-5 py-2 text-sm font-semibold text-ai">
            <Volume2 aria-hidden className="h-4 w-4" strokeWidth={2.5} />
            {t("home.mock.listen", "Listen")}
          </span>

          <div className="mt-5 flex w-full flex-col items-center border-t border-sumi/10 pt-4">
            <span className="rounded-full bg-sumi/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sumi-soft">
              {t("home.mock.verb", "Verb")}
            </span>
            <p lang="ja" className="mt-2 text-2xl font-bold text-sumi">
              借りる
            </p>
          </div>

          <div className="mt-5 w-full rounded-2xl bg-washi-soft px-4 py-3 text-left">
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-sumi-soft">
              <MessageSquareQuote aria-hidden className="h-3 w-3" />
              {t("home.mock.example", "Example")}
            </p>
            <p className="text-sumi">
              Can I{" "}
              <strong className="rounded bg-ai-soft px-1 font-bold text-ai-dark">borrow</strong>{" "}
              your pen?
            </p>
            <p lang="ja" className="mt-0.5 text-sm text-sumi-soft">
              ペンを借りてもいいですか？
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 flex h-12 w-4/5 items-center justify-center gap-2 rounded-full bg-ai text-sm font-semibold text-washi shadow-sm">
        {t("home.mock.got_it", "Got it — next word")}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </div>
    </div>
  );
}
