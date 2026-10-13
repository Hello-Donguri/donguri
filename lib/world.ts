import "server-only";

import { prisma } from "@/lib/prisma";
import { imageUrl } from "@/lib/bunny";
import { requireAdminProfile } from "@/lib/dal";

// The learner's world map, country tours and room — see section 58 of
// supabase/schema.sql. Countries, slides and items are set up by an admin
// (/dashboard/admin/world); a learner picks items at the end of a
// country's tour and arranges them in their room. Shared across courses.
//
// Still in development: admins only, and only reached from the course
// page in dev mode (see WorldShortcuts). To open it to learners, swap
// requireWorldAccess for requireLearner, here and in lib/actions/world.ts.
export const requireWorldAccess = requireAdminProfile;

export type WorldMapCountry = {
  id: string;
  mapKey: string;
  name: string;
  itemCount: number;
  ownedCount: number;
};

export type WorldSlide = { id: string; title: string | null; body: string; imageUrl: string | null };

export type WorldItemSummary = { id: string; name: string; imageUrl: string; owned: boolean };

export type CountryTour = {
  id: string;
  name: string;
  slides: WorldSlide[];
  items: WorldItemSummary[];
};

export type RoomItem = { id: string; name: string; imageUrl: string; x: number; y: number; z: number };

export type Room = { backgroundUrl: string | null; items: RoomItem[] };

// Every country that's switched on, with how many of its items the
// learner has — what lights up on their map.
export async function getWorldMap(): Promise<WorldMapCountry[]> {
  const user = await requireWorldAccess();
  const countries = await prisma.worldCountry.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      mapKey: true,
      name: true,
      items: {
        where: { active: true },
        select: { owners: { where: { userId: user.id }, select: { id: true } } },
      },
    },
  });

  return countries.map((country) => ({
    id: country.id,
    mapKey: country.mapKey,
    name: country.name,
    itemCount: country.items.length,
    ownedCount: country.items.filter((item) => item.owners.length > 0).length,
  }));
}

// One country's slides in order, and its items with which the learner
// already owns. Null for a country that doesn't exist or is switched off.
export async function getCountryTour(countryId: string): Promise<CountryTour | null> {
  const user = await requireWorldAccess();
  const country = await prisma.worldCountry.findFirst({
    where: { id: countryId, active: true },
    select: {
      id: true,
      name: true,
      slides: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, body: true, imageKey: true },
      },
      items: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          imageKey: true,
          owners: { where: { userId: user.id }, select: { id: true } },
        },
      },
    },
  });
  if (!country) return null;

  return {
    id: country.id,
    name: country.name,
    slides: country.slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      body: slide.body,
      imageUrl: slide.imageKey ? imageUrl(slide.imageKey) : null,
    })),
    items: country.items.map((item) => ({
      id: item.id,
      name: item.name,
      imageUrl: imageUrl(item.imageKey),
      owned: item.owners.length > 0,
    })),
  };
}

// The learner's room: the background and every item they own (hidden
// items included — they keep what they picked), back to front.
export async function getRoom(): Promise<Room> {
  const user = await requireWorldAccess();
  const [room, owned] = await Promise.all([
    prisma.worldRoom.findUnique({ where: { id: 1 }, select: { backgroundKey: true } }),
    prisma.userWorldItem.findMany({
      where: { userId: user.id },
      orderBy: [{ z: "asc" }, { createdAt: "asc" }],
      select: { id: true, x: true, y: true, z: true, item: { select: { name: true, imageKey: true } } },
    }),
  ]);

  return {
    backgroundUrl: room?.backgroundKey ? imageUrl(room.backgroundKey) : null,
    items: owned.map((row) => ({
      id: row.id,
      name: row.item.name,
      imageUrl: imageUrl(row.item.imageKey),
      x: row.x,
      y: row.y,
      z: row.z,
    })),
  };
}

export type AdminWorldCountry = {
  id: string;
  mapKey: string;
  name: string;
  active: boolean;
  slideCount: number;
  itemCount: number;
};

export async function adminWorldCountries(): Promise<AdminWorldCountry[]> {
  await requireAdminProfile();
  const countries = await prisma.worldCountry.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      mapKey: true,
      name: true,
      active: true,
      _count: { select: { slides: true, items: true } },
    },
  });
  return countries.map(({ _count, ...country }) => ({
    ...country,
    slideCount: _count.slides,
    itemCount: _count.items,
  }));
}

export type AdminWorldCountryDetail = {
  id: string;
  mapKey: string;
  name: string;
  active: boolean;
  slides: (WorldSlide & { position: number })[];
  items: { id: string; name: string; imageUrl: string; active: boolean; ownerCount: number }[];
};

export async function adminWorldCountry(countryId: string): Promise<AdminWorldCountryDetail | null> {
  await requireAdminProfile();
  const country = await prisma.worldCountry.findUnique({
    where: { id: countryId },
    select: {
      id: true,
      mapKey: true,
      name: true,
      active: true,
      slides: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, position: true, title: true, body: true, imageKey: true },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, imageKey: true, active: true, _count: { select: { owners: true } } },
      },
    },
  });
  if (!country) return null;

  return {
    id: country.id,
    mapKey: country.mapKey,
    name: country.name,
    active: country.active,
    slides: country.slides.map((slide) => ({
      id: slide.id,
      position: slide.position,
      title: slide.title,
      body: slide.body,
      imageUrl: slide.imageKey ? imageUrl(slide.imageKey) : null,
    })),
    items: country.items.map((item) => ({
      id: item.id,
      name: item.name,
      imageUrl: imageUrl(item.imageKey),
      active: item.active,
      ownerCount: item._count.owners,
    })),
  };
}

export async function adminRoomBackground(): Promise<string | null> {
  await requireAdminProfile();
  const room = await prisma.worldRoom.findUnique({ where: { id: 1 }, select: { backgroundKey: true } });
  return room?.backgroundKey ? imageUrl(room.backgroundKey) : null;
}

// How many souvenirs the learner has — the count on the course page's
// "See my room" card.
export async function getRoomItemCount(): Promise<number> {
  const user = await requireWorldAccess();
  return prisma.userWorldItem.count({ where: { userId: user.id } });
}
