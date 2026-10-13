"use client";

import { useLayoutEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sofa } from "lucide-react";
import { pickWorldItem } from "@/lib/actions/world";
import type { CountryTour as Tour, WorldItemSummary } from "@/lib/world";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

// A country's tour: its slides one at a time — an image and some text
// each — then a last step to pick one of its items for the learner's room.
// Items they already own are shown as collected; once everything is,
// there's nothing left to pick, but the slides are still there to read.
export function CountryTour({ tour, mapHref, roomHref }: { tour: Tour; mapHref: string; roomHref: string }) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const steps = tour.slides.length + 1;
  const [step, setStep] = useState(0);
  // Which way the last move went, so slides slide in from the right side.
  const [direction, setDirection] = useState(1);
  const go = (to: number) => {
    setDirection(to > step ? 1 : -1);
    setStep(Math.max(0, Math.min(steps - 1, to)));
  };

  // Picked this visit, on top of what the server says is owned — kept
  // here, not in the picker, so stepping back through the slides doesn't
  // forget them.
  const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set());
  const items = tour.items.map((item) => ({ ...item, owned: item.owned || pickedIds.has(item.id) }));

  // Next.js keeps this page alive, hidden, when the learner navigates away
  // (see "Preserving UI state" in the Next.js docs). Start the tour afresh
  // when it's hidden, so coming back shows the server's ownership — e.g.
  // after the room is reset — not what was picked last time.
  useLayoutEffect(
    () => () => {
      setStep(0);
      setPickedIds(new Set());
    },
    [],
  );

  const slide = tour.slides[step];
  const offset = reduceMotion ? 0 : 60;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* One dot per slide, plus the pick at the end. */}
      <div className="flex items-center justify-center gap-1.5" aria-hidden>
        {Array.from({ length: steps }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-2 rounded-full transition-all",
              index === step ? "w-6 bg-ai" : index < step ? "w-2 bg-ai/50" : "w-2 bg-sumi/15",
            )}
          />
        ))}
      </div>

      <div className="relative overflow-hidden rounded-4xl border border-card-border bg-raised shadow-xl">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * offset }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {slide ? (
              <div>
                {slide.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- a bunny.net image.
                  <img src={slide.imageUrl} alt="" className="aspect-[16/10] w-full bg-washi object-cover" />
                )}
                <div className="flex flex-col gap-3 p-6 sm:p-8">
                  {slide.title && (
                    <h2 className="font-nunito text-2xl font-black text-sumi sm:text-3xl">{slide.title}</h2>
                  )}
                  {slide.body && <p className="whitespace-pre-line text-lg leading-relaxed text-sumi">{slide.body}</p>}
                </div>
              </div>
            ) : (
              <ItemPicker
                country={tour.name}
                items={items}
                onPicked={(id) => setPickedIds((current) => new Set(current).add(id))}
                mapHref={mapHref}
                roomHref={roomHref}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => go(step - 1)} disabled={step === 0}>
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {t("world.back", "Back")}
        </Button>
        {step < steps - 1 && (
          <Button onClick={() => go(step + 1)}>
            {step === steps - 2 ? t("world.pick_an_item", "Pick an item") : t("world.next", "Next")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// The tour's last step: the country's items, one to choose and keep.
function ItemPicker({
  country,
  items,
  onPicked,
  mapHref,
  roomHref,
}: {
  country: string;
  items: WorldItemSummary[];
  onPicked: (itemId: string) => void;
  mapHref: string;
  roomHref: string;
}) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const [chosen, setChosen] = useState<string | null>(null);
  const [picked, setPicked] = useState<WorldItemSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const left = items.filter((item) => !item.owned);

  const keep = () => {
    const item = items.find((candidate) => candidate.id === chosen);
    if (!item) return;
    setFailed(false);
    startTransition(async () => {
      const { ok } = await pickWorldItem(item.id);
      if (!ok) {
        setFailed(true);
        return;
      }
      onPicked(item.id);
      setPicked(item);
      setChosen(null);
    });
  };

  if (picked) {
    return (
      <div className="relative flex flex-col items-center gap-4 p-8 text-center">
        {!reduceMotion && <Confetti pieces={40} />}
        <motion.div
          initial={reduceMotion ? false : { scale: 0.4, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="flex h-40 w-40 items-center justify-center rounded-full bg-kin/25"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a bunny.net image. */}
          <img src={picked.imageUrl} alt="" className="h-32 w-32 object-contain" />
        </motion.div>
        <h2 className="font-nunito text-2xl font-black text-sumi">
          {t("world.picked_title", "{{name}} is yours!", { name: picked.name })}
        </h2>
        <p className="text-sumi-soft">{t("world.picked_body", "It's waiting for you in your room.")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button href={roomHref}>
            <Sofa aria-hidden className="h-4 w-4" />
            {t("world.see_my_room", "See my room")}
          </Button>
          {left.length > 0 && (
            <Button variant="outline" onClick={() => setPicked(null)}>
              {t("world.pick_another", "Pick another")}
            </Button>
          )}
          <Button variant="outline" href={mapHref}>
            {t("world.back_to_map", "Back to the map")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6 sm:p-8">
      <div className="text-center">
        <h2 className="font-nunito text-2xl font-black text-sumi sm:text-3xl">
          {left.length > 0
            ? t("world.pick_title", "Pick a souvenir")
            : t("world.all_collected_title", "You've collected everything!")}
        </h2>
        <p className="mt-1 text-sumi-soft">
          {items.length === 0
            ? t("world.no_items", "There's nothing to pick here yet — come back soon.")
            : left.length > 0
              ? t("world.pick_body", "Choose one to keep in your room. You can come back for the others.")
              : t("world.all_collected_body", "Every souvenir from {{country}} is in your room.", {
                  country,
                })}
        </p>
      </div>

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={item.owned || pending}
                onClick={() => setChosen(item.id)}
                aria-pressed={chosen === item.id}
                className={cn(
                  "relative flex w-full flex-col items-center gap-2 rounded-3xl border-2 p-4 transition",
                  item.owned
                    ? "cursor-default border-matcha/40 bg-matcha-soft/50"
                    : chosen === item.id
                      ? "-translate-y-1 border-kin bg-kin/20 shadow-md"
                      : "border-card-border bg-washi hover:-translate-y-0.5 hover:border-kin/60",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a bunny.net image. */}
                <img
                  src={item.imageUrl}
                  alt=""
                  className={cn("h-24 w-24 object-contain", item.owned && "opacity-60")}
                />
                <span className="text-sm font-semibold text-sumi">{item.name}</span>
                {item.owned && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-matcha-dark">
                    <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
                    {t("world.in_your_room", "In your room")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {failed && (
        <p className="text-center text-sm text-shu">
          {t("world.pick_failed", "That one can't be picked right now. Try another.")}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {left.length > 0 ? (
          <Button onClick={keep} disabled={!chosen || pending}>
            {pending ? t("world.keeping", "Keeping…") : t("world.keep", "Keep this one")}
          </Button>
        ) : (
          <Button href={roomHref}>
            <Sofa aria-hidden className="h-4 w-4" />
            {t("world.see_my_room", "See my room")}
          </Button>
        )}
        <Button variant="outline" href={mapHref}>
          {t("world.back_to_map", "Back to the map")}
        </Button>
      </div>
    </div>
  );
}
