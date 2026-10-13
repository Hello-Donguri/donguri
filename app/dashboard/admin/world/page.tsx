import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAdminProfile } from "@/lib/dal";
import { adminRoomBackground, adminWorldCountries } from "@/lib/world";
import worldMap from "@/lib/world-map.json";
import { setWorldCountryActive } from "@/lib/actions/world";
import { CreateWorldCountryForm, RoomBackgroundForm } from "@/components/admin/world-forms";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "World map — Donguri",
};

// The world map's countries (each opening to its slides and items) and the
// room background every learner's souvenirs sit on.
export default async function AdminWorldPage() {
  await requireAdminProfile();
  const [countries, backgroundUrl, { t }] = await Promise.all([
    adminWorldCountries(),
    adminRoomBackground(),
    getTranslator(),
  ]);
  const taken = new Set(countries.map((country) => country.mapKey));
  const options = worldMap.countries
    .filter((country) => !taken.has(country.key))
    .map(({ key, name }) => ({ key, name }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { href: "/dashboard/admin", label: t("admin_hub.title", "Admin") },
            { label: t("admin_world.title", "World map") },
          ]}
        />
        <PageTitle>{t("admin_world.title", "World map")}</PageTitle>
        <PageSubtitle>
          {t(
            "admin_world.subtitle",
            "Countries learners can visit on the world map. Each has a few slides, then items to pick for their room.",
          )}
        </PageSubtitle>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-3">
          {countries.length === 0 && (
            <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sumi-soft">
              {t("admin_world.none", "No countries yet — add the first one.")}
            </p>
          )}
          {countries.map((country) => (
            <div
              key={country.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-card-border bg-washi-soft p-4"
            >
              <Link
                href={`/dashboard/admin/world/${country.id}`}
                className="group flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-sumi group-hover:text-ai-dark">{country.name}</span>
                  <span className="block text-sm text-sumi-soft">
                    {t("admin_world.counts", "{{slides}} slides · {{items}} items", {
                      slides: country.slideCount,
                      items: country.itemCount,
                    })}
                  </span>
                </span>
                <ArrowRight aria-hidden className="h-4 w-4 text-sumi-soft group-hover:text-sumi" />
              </Link>
              <VisibilityToggle
                active={country.active}
                toggleAction={setWorldCountryActive.bind(null, country.id)}
                label={country.name}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-card-border bg-washi-soft p-6">
            <h2 className="mb-4 font-semibold text-sumi">{t("admin_world.new_country", "New country")}</h2>
            <CreateWorldCountryForm options={options} />
          </div>
          <div className="rounded-2xl border border-card-border bg-washi-soft p-6">
            <h2 className="mb-4 font-semibold text-sumi">{t("admin_world.room", "Room")}</h2>
            <RoomBackgroundForm currentUrl={backgroundUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
