import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourseHome } from "@/lib/dal";
import { getCountryTour } from "@/lib/world";
import { getTranslator } from "@/lib/i18n/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle } from "@/components/ui/page-heading";
import { CountryTour } from "@/components/world/country-tour";

type PageProps = {
  params: Promise<{ slug: string; countryId: string }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { countryId } = await params;
  const tour = UUID.test(countryId) ? await getCountryTour(countryId) : null;
  return { title: `${tour?.name ?? "World map"} — Donguri` };
}

// One country's tour: its slides, then a souvenir to pick for the room.
export default async function CountryTourPage({ params }: PageProps) {
  const { slug, countryId } = await params;
  if (!UUID.test(countryId)) notFound();
  const [{ course }, tour, { t }] = await Promise.all([
    getCourseHome(slug),
    getCountryTour(countryId),
    getTranslator(),
  ]);
  if (!tour) notFound();

  const mapHref = `/dashboard/courses/${slug}/world`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { href: `/dashboard/courses/${slug}`, label: course.title },
            { href: mapHref, label: t("world.map_title", "World map") },
            { label: tour.name },
          ]}
        />
        <PageTitle>{tour.name}</PageTitle>
      </div>

      <CountryTour tour={tour} mapHref={mapHref} roomHref={`/dashboard/courses/${slug}/room`} />
    </div>
  );
}
