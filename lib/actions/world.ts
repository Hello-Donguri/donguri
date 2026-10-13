"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { requireWorldAccess } from "@/lib/world";
import { prisma } from "@/lib/prisma";
import { buildWorldImageKey, uploadImage } from "@/lib/bunny";
import worldMap from "@/lib/world-map.json";
import {
  CreateWorldCountryFormSchema,
  CreateWorldItemFormSchema,
  CreateWorldSlideFormSchema,
  UpdateWorldCountryFormSchema,
  UpdateWorldItemFormSchema,
  UpdateWorldSlideFormSchema,
  WorldRoomFormSchema,
  type WorldFormState,
} from "@/lib/definitions";

const NOT_ALLOWED = "You don't have permission to do that.";
const UPLOAD_FAILED = "Image upload failed. Try again.";
const ADMIN_PATH = "/dashboard/admin/world";

// --- Learners -----------------------------------------------------------------

// Where a newly picked item lands in the room: near the middle, nudged a
// little so several picked in a row don't stack exactly.
function landingSpot(): { x: number; y: number } {
  const nudge = () => (Math.random() - 0.5) * 0.3;
  return { x: 0.5 + nudge(), y: 0.6 + nudge() / 2 };
}

// Picks an item at the end of a country's tour. One the learner already
// owns is left where it is. Lands in front of everything else in the room.
export async function pickWorldItem(itemId: string): Promise<{ ok: boolean }> {
  const user = await requireWorldAccess();
  const item = await prisma.worldItem.findFirst({
    where: { id: itemId, active: true, country: { active: true } },
    select: { id: true },
  });
  if (!item) return { ok: false };

  const front = await prisma.userWorldItem.aggregate({ where: { userId: user.id }, _max: { z: true } });
  await prisma.userWorldItem.upsert({
    where: { userId_itemId: { userId: user.id, itemId } },
    create: { userId: user.id, itemId, ...landingSpot(), z: (front._max.z ?? 0) + 1 },
    update: {},
  });

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

// Saves where the learner dragged an item in their room. x and y are
// fractions of the room (clamped to it); z is its layer.
export async function moveRoomItem(ownedId: string, x: number, y: number, z: number): Promise<void> {
  const user = await requireWorldAccess();
  if (![x, y, z].every(Number.isFinite)) return;
  await prisma.userWorldItem.updateMany({
    where: { id: ownedId, userId: user.id },
    data: { x: clampUnit(x), y: clampUnit(y), z, updatedAt: new Date() },
  });
}

// Dev mode's "Reset room": takes every item out of the learner's room, as
// if they'd never picked one, so the map can be tried from the start.
export async function resetRoom(): Promise<void> {
  const user = await requireWorldAccess();
  await prisma.userWorldItem.deleteMany({ where: { userId: user.id } });
  revalidatePath("/dashboard", "layout");
}

// --- Admin ----------------------------------------------------------------------

async function isAdmin(): Promise<boolean> {
  const profile = await requireProfile();
  return profile.role === "admin";
}

function uploadedFile(value: FormDataEntryValue | null): File | undefined {
  return value instanceof File && value.size > 0 ? value : undefined;
}

// Uploads an image to bunny.net, returning its key — or null if it failed.
async function uploadWorldImage(image: File): Promise<string | null> {
  const key = buildWorldImageKey(image.type);
  try {
    await uploadImage(image, key);
    return key;
  } catch (error) {
    console.error("Bunny image upload failed:", error);
    return null;
  }
}

const MAP_KEYS = new Set(worldMap.countries.map((country) => country.key));

export async function createWorldCountry(_state: WorldFormState, formData: FormData): Promise<WorldFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = CreateWorldCountryFormSchema.safeParse({
    mapKey: formData.get("mapKey"),
    name: formData.get("name"),
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { mapKey, name } = validated.data;
  if (!MAP_KEYS.has(mapKey)) return { errors: { mapKey: ["That country isn't on the map."] } };
  if (await prisma.worldCountry.findUnique({ where: { mapKey }, select: { id: true } })) {
    return { errors: { mapKey: ["That country is already set up."] } };
  }

  await prisma.worldCountry.create({ data: { mapKey, name } });
  revalidatePath(ADMIN_PATH);
  return { success: true, message: `"${name}" added. Open it to add slides and items.` };
}

export async function updateWorldCountry(_state: WorldFormState, formData: FormData): Promise<WorldFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = UpdateWorldCountryFormSchema.safeParse({
    countryId: formData.get("countryId"),
    name: formData.get("name"),
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { countryId, name } = validated.data;
  await prisma.worldCountry.update({ where: { id: countryId }, data: { name } });
  revalidatePath(ADMIN_PATH, "layout");
  return { success: true, message: "Saved." };
}

// A hidden country goes dark on every map; learners keep its items.
export async function setWorldCountryActive(countryId: string, active: boolean): Promise<void> {
  if (!(await isAdmin())) throw new Error(NOT_ALLOWED);
  await prisma.worldCountry.update({ where: { id: countryId }, data: { active } });
  revalidatePath(ADMIN_PATH, "layout");
}

// Permanent: its slides, items, and every learner's copy of them go too.
export async function deleteWorldCountry(countryId: string): Promise<void> {
  if (!(await isAdmin())) throw new Error(NOT_ALLOWED);
  await prisma.worldCountry.delete({ where: { id: countryId } });
  revalidatePath(ADMIN_PATH, "layout");
}

// A new slide goes at the end of the country's tour.
export async function createWorldSlide(_state: WorldFormState, formData: FormData): Promise<WorldFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = CreateWorldSlideFormSchema.safeParse({
    countryId: formData.get("countryId"),
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    image: uploadedFile(formData.get("image")),
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { countryId, title, body, image } = validated.data;
  if (!title && !body && !image) return { message: "Give the slide some text or an image." };

  let imageKey: string | null = null;
  if (image) {
    imageKey = await uploadWorldImage(image);
    if (!imageKey) return { message: UPLOAD_FAILED };
  }

  const last = await prisma.worldCountrySlide.aggregate({ where: { countryId }, _max: { position: true } });
  await prisma.worldCountrySlide.create({
    data: { countryId, title, body, imageKey, position: (last._max.position ?? -1) + 1 },
  });
  revalidatePath(ADMIN_PATH, "layout");
  return { success: true, message: "Slide added." };
}

// A new image replaces the old one (the old bunny.net file is left, as
// with badges); leaving it empty keeps it, unless "remove image" is ticked.
export async function updateWorldSlide(_state: WorldFormState, formData: FormData): Promise<WorldFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = UpdateWorldSlideFormSchema.safeParse({
    slideId: formData.get("slideId"),
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    image: uploadedFile(formData.get("image")),
    removeImage: formData.get("removeImage") === "on",
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { slideId, title, body, image, removeImage } = validated.data;
  let imageKey: string | null | undefined = removeImage ? null : undefined;
  if (image) {
    imageKey = await uploadWorldImage(image);
    if (!imageKey) return { message: UPLOAD_FAILED };
  }

  await prisma.worldCountrySlide.update({
    where: { id: slideId },
    data: { title, body, ...(imageKey !== undefined ? { imageKey } : {}) },
  });
  revalidatePath(ADMIN_PATH, "layout");
  return { success: true, message: "Saved." };
}

// Swaps a slide with its neighbour — `direction` -1 is earlier, 1 later.
// Positions are renumbered 0, 1, 2… on the way, so gaps and ties from
// deletions don't matter.
export async function moveWorldSlide(slideId: string, direction: -1 | 1): Promise<void> {
  if (!(await isAdmin())) throw new Error(NOT_ALLOWED);
  const slide = await prisma.worldCountrySlide.findUniqueOrThrow({
    where: { id: slideId },
    select: { countryId: true },
  });
  const slides = await prisma.worldCountrySlide.findMany({
    where: { countryId: slide.countryId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const ids = slides.map((row) => row.id);
  const from = ids.indexOf(slideId);
  const to = from + direction;
  if (to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];

  await prisma.$transaction(
    ids.map((id, position) => prisma.worldCountrySlide.update({ where: { id }, data: { position } })),
  );
  revalidatePath(ADMIN_PATH, "layout");
}

export async function deleteWorldSlide(slideId: string): Promise<void> {
  if (!(await isAdmin())) throw new Error(NOT_ALLOWED);
  await prisma.worldCountrySlide.delete({ where: { id: slideId } });
  revalidatePath(ADMIN_PATH, "layout");
}

export async function createWorldItem(_state: WorldFormState, formData: FormData): Promise<WorldFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = CreateWorldItemFormSchema.safeParse({
    countryId: formData.get("countryId"),
    name: formData.get("name"),
    image: uploadedFile(formData.get("image")),
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { countryId, name, image } = validated.data;
  const imageKey = await uploadWorldImage(image);
  if (!imageKey) return { message: UPLOAD_FAILED };

  await prisma.worldItem.create({ data: { countryId, name, imageKey } });
  revalidatePath(ADMIN_PATH, "layout");
  return { success: true, message: `"${name}" added.` };
}

export async function updateWorldItem(_state: WorldFormState, formData: FormData): Promise<WorldFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = UpdateWorldItemFormSchema.safeParse({
    itemId: formData.get("itemId"),
    name: formData.get("name"),
    image: uploadedFile(formData.get("image")),
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { itemId, name, image } = validated.data;
  let imageKey: string | undefined;
  if (image) {
    imageKey = (await uploadWorldImage(image)) ?? undefined;
    if (!imageKey) return { message: UPLOAD_FAILED };
  }

  await prisma.worldItem.update({ where: { id: itemId }, data: { name, ...(imageKey ? { imageKey } : {}) } });
  revalidatePath(ADMIN_PATH, "layout");
  return { success: true, message: "Saved." };
}

// A hidden item can't be picked any more; learners who have it keep it.
export async function setWorldItemActive(itemId: string, active: boolean): Promise<void> {
  if (!(await isAdmin())) throw new Error(NOT_ALLOWED);
  await prisma.worldItem.update({ where: { id: itemId }, data: { active } });
  revalidatePath(ADMIN_PATH, "layout");
}

// Permanent: it disappears from every learner's room too.
export async function deleteWorldItem(itemId: string): Promise<void> {
  if (!(await isAdmin())) throw new Error(NOT_ALLOWED);
  await prisma.worldItem.delete({ where: { id: itemId } });
  revalidatePath(ADMIN_PATH, "layout");
}

export async function setRoomBackground(_state: WorldFormState, formData: FormData): Promise<WorldFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = WorldRoomFormSchema.safeParse({ image: uploadedFile(formData.get("image")) });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const backgroundKey = await uploadWorldImage(validated.data.image);
  if (!backgroundKey) return { message: UPLOAD_FAILED };

  await prisma.worldRoom.upsert({
    where: { id: 1 },
    create: { id: 1, backgroundKey },
    update: { backgroundKey, updatedAt: new Date() },
  });
  revalidatePath(ADMIN_PATH, "layout");
  return { success: true, message: "Room background saved." };
}
