// Notification-style count bubble pinned to the corner of a card's icon chip.
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold leading-none text-white shadow-sm ring-2 ring-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
