import type { Metadata } from "next";
import { Sofa } from "lucide-react";
import { getCourseHome, getCourseTitle } from "@/lib/dal";
import { getWorldMap } from "@/lib/world";
import { getTranslator } from "@/lib/i18n/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { WorldMap } from "@/components/world/world-map";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `World map — ${await getCourseTitle(slug)}` };
}

// The world map: countries set up in /dashboard/admin/world light up, and
// opening one plays its tour (./[countryId]). Shared across courses — the
// course is just where it's reached from, and where "back" goes.
export default async function WorldMapPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ course }, countries, { t }] = await Promise.all([getCourseHome(slug), getWorldMap(), getTranslator()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
              { href: `/dashboard/courses/${slug}`, label: course.title },
              { label: t("world.map_title", "World map") },
            ]}
          />
          <PageTitle>{t("world.map_title", "World map")}</PageTitle>
          <PageSubtitle>
            {t("world.map_subtitle", "Visit a country to learn a little about it, then pick a souvenir for your room.")}
          </PageSubtitle>
        </div>
        <Button variant="outline" href={`/dashboard/courses/${slug}/room`}>
          <Sofa aria-hidden className="h-4 w-4" />
          {t("world.see_my_room", "See my room")}
        </Button>
      </div>

      <WorldMap countries={countries} hrefBase={`/dashboard/courses/${slug}/world`} />
    </div>
  );
}
