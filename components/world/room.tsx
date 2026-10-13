"use client";

import { useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import { RotateCcw } from "lucide-react";
import { moveRoomItem, resetRoom } from "@/lib/actions/world";
import type { Room as RoomData, RoomItem } from "@/lib/world";
import { useTranslations } from "@/components/i18n/locale-provider";
import { DevModeOnly } from "@/components/dashboard/dev-mode-only";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// How far an arrow key moves an item, as a fraction of the room.
const KEY_STEP = 0.02;

// The learner's room: the admin's background with every item they've
// picked on the world map, each where they left it. Drag one (or focus it
// and use the arrow keys) to move it; it comes to the front and its spot
// is saved — x and y as fractions of the room, so it stays put at any
// screen size, and z as its layer. The room keeps a fixed 4:3 shape for
// the same reason.
export function Room({ room }: { room: RoomData }) {
  const t = useTranslations();
  const roomRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(room.items);
  const [dragging, setDragging] = useState<string | null>(null);
  // Where in the item the pointer took hold, so it doesn't jump to centre.
  const grab = useRef({ dx: 0, dy: 0 });
  const [resetting, startReset] = useTransition();

  // Dev mode: empty the room, as if nothing had ever been picked.
  const reset = () => {
    if (!confirm(t("world.reset_room_confirm", "Take every item out of your room? You can pick them again on the map."))) {
      return;
    }
    startReset(async () => {
      await resetRoom();
      setItems([]);
    });
  };

  const place = (id: string, change: Partial<RoomItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));

  // Puts an item in front of the rest, returning its new z.
  const toFront = (id: string) => {
    const top = Math.max(0, ...items.filter((item) => item.id !== id).map((item) => item.z));
    const item = items.find((candidate) => candidate.id === id);
    const z = item && item.z > top ? item.z : top + 1;
    place(id, { z });
    return z;
  };

  const fractionAt = (event: PointerEvent) => {
    const box = roomRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width - grab.current.dx)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height - grab.current.dy)),
    };
  };

  const save = (id: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (item) void moveRoomItem(item.id, item.x, item.y, item.z);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, item: RoomItem) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const box = roomRef.current!.getBoundingClientRect();
    grab.current = {
      dx: (event.clientX - box.left) / box.width - item.x,
      dy: (event.clientY - box.top) / box.height - item.y,
    };
    toFront(item.id);
    setDragging(item.id);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>, item: RoomItem) => {
    if (dragging !== item.id) return;
    place(item.id, fractionAt(event));
  };

  const onPointerUp = (item: RoomItem) => {
    if (dragging !== item.id) return;
    setDragging(null);
    save(item.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, item: RoomItem) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const x = Math.min(1, Math.max(0, item.x + move[0]));
    const y = Math.min(1, Math.max(0, item.y + move[1]));
    const z = toFront(item.id);
    place(item.id, { x, y });
    void moveRoomItem(item.id, x, y, z);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={roomRef}
        className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-4xl border-4 border-raised shadow-xl"
      >
        {room.backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a bunny.net image.
          <img src={room.backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        ) : (
          // No background uploaded yet: a plain wall and floor.
          <div aria-hidden className="absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-[62%] bg-acorn-soft" />
            <div className="absolute inset-x-0 bottom-0 h-[38%] bg-kin/40" />
          </div>
        )}

        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={t("world.move_item", "{{name}} — use the arrow keys to move it", { name: item.name })}
            onPointerDown={(event) => onPointerDown(event, item)}
            onPointerMove={(event) => onPointerMove(event, item)}
            onPointerUp={() => onPointerUp(item)}
            onPointerCancel={() => onPointerUp(item)}
            onKeyDown={(event) => onKeyDown(event, item)}
            style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, zIndex: Math.round(item.z) }}
            className={cn(
              "group absolute w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-2xl outline-none transition-transform focus-visible:ring-4 focus-visible:ring-ai",
              dragging === item.id ? "scale-110 cursor-grabbing" : "cursor-grab hover:scale-105",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a bunny.net image. */}
            <img
              src={item.imageUrl}
              alt=""
              draggable={false}
              className={cn(
                "pointer-events-none w-full object-contain",
                dragging === item.id && "drop-shadow-[0_8px_0_rgb(0_0_0/0.15)]",
              )}
            />
            <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-raised px-2 py-0.5 text-xs font-semibold text-sumi opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {item.name}
            </span>
          </button>
        ))}

        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="max-w-xs rounded-2xl bg-raised/90 px-5 py-4 text-center font-semibold text-sumi shadow">
              {t("world.room_empty", "Your room is empty. Visit a country on the world map to pick your first souvenir!")}
            </p>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <p className="text-center text-sm text-sumi-soft">
          {t("world.room_hint", "Drag your souvenirs to arrange your room. They stay where you put them.")}
        </p>
      )}

      <DevModeOnly>
        <div className="flex justify-center">
          <Button
            variant="outline"
            tone="danger"
            size="sm"
            onClick={reset}
            disabled={resetting || items.length === 0}
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            {resetting ? t("world.resetting_room", "Resetting…") : t("world.reset_room", "Reset room")}
          </Button>
        </div>
      </DevModeOnly>
    </div>
  );
}
