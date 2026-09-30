import Image from "next/image";
import DonguriMascot from "@/components/icons/DonguriMascot";
import { ACCESSORIES, type AccessoryId } from "@/lib/levels";
import { cn } from "@/lib/utils";

type DonguriAvatarProps = {
  equippedAccessory: AccessoryId | string | null | undefined;
  className?: string;
};

// The costume images (public/costumes/*.webp) are full standalone
// illustrations of the character already wearing that one accessory, not
// transparent overlays — so "equipping" one just swaps which image renders,
// falling back to the plain animated mascot when nothing is equipped.
export function DonguriAvatar({ equippedAccessory, className }: DonguriAvatarProps) {
  const accessory = ACCESSORIES.find((candidate) => candidate.id === equippedAccessory);

  if (!accessory) {
    return <DonguriMascot className={className} />;
  }

  // object-contain: the costume art isn't square (1224×1285), and callers
  // often size the avatar as a square box (h-8 w-8) — without it the
  // picture is squashed to fit instead of kept in proportion.
  return (
    <Image
      src={accessory.image}
      alt={`Donguri wearing ${accessory.label}`}
      width={1224}
      height={1285}
      className={cn("object-contain", className)}
    />
  );
}
