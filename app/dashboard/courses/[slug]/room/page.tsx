import type { Metadata } from "next";
import { Earth } from "lucide-react";
import { getCourseHome, getCourseTitle } from "@/lib/dal";
import { getRoom } from "@/lib/world";
import { getTranslator } from "@/lib/i18n/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Room } from "@/components/world/room";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `My room — ${await getCourseTitle(slug)}` };
}

// The learner's room: every souvenir they've picked on the world map, where
// they've arranged it. One room, whichever course it's opened from.
export default async function RoomPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ course }, room, { t }] = await Promise.all([getCourseHome(slug), getRoom(), getTranslator()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
              { href: `/dashboard/courses/${slug}`, label: course.title },
              { label: t("world.room_title", "My room") },
            ]}
          />
          <PageTitle>{t("world.room_title", "My room")}</PageTitle>
          <PageSubtitle>
            {t("world.room_subtitle", "{{count}} souvenirs from around the world.", { count: room.items.length })}
          </PageSubtitle>
        </div>
        <Button variant="outline" href={`/dashboard/courses/${slug}/world`}>
          <Earth aria-hidden className="h-4 w-4" />
          {t("world.open_map", "World map")}
        </Button>
      </div>

      {/* Remounted when the items change (one picked, or the room reset),
          since Next.js keeps this page alive between visits and Room holds
          its own copy of them while they're dragged around. */}
      <Room key={room.items.map((item) => item.id).join()} room={room} />
    </div>
  );
}
