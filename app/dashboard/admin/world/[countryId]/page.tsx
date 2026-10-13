import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminProfile } from "@/lib/dal";
import { adminWorldCountry } from "@/lib/world";
import { setWorldCountryActive } from "@/lib/actions/world";
import {
  CreateWorldItemForm,
  CreateWorldSlideForm,
  EditWorldCountryForm,
  EditWorldItemForm,
  EditWorldSlideForm,
} from "@/components/admin/world-forms";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle, SectionHeading } from "@/components/ui/page-heading";
import { getTranslator } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ countryId: string }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: "World map — Donguri",
};

// One country: its name, its slides in order, and the items learners can
// pick at the end of them.
export default async function AdminWorldCountryPage({ params }: PageProps) {
  await requireAdminProfile();
  const { countryId } = await params;
  if (!UUID.test(countryId)) notFound();
  const [country, { t }] = await Promise.all([adminWorldCountry(countryId), getTranslator()]);
  if (!country) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { href: "/dashboard/admin", label: t("admin_hub.title", "Admin") },
            { href: "/dashboard/admin/world", label: t("admin_world.title", "World map") },
            { label: country.name },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageTitle>{country.name}</PageTitle>
          <VisibilityToggle
            active={country.active}
            toggleAction={setWorldCountryActive.bind(null, country.id)}
            label={country.name}
          />
        </div>
        <PageSubtitle>
          {t(
            "admin_world.country_subtitle",
            "Learners see the slides in order, then pick one of the items for their room. They can come back for the rest.",
          )}
        </PageSubtitle>
        <div className="mt-4 rounded-2xl border border-card-border bg-washi-soft p-4">
          <EditWorldCountryForm
            country={{ id: country.id, name: country.name, itemCount: country.items.length }}
          />
        </div>
      </div>

      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-3">
          <SectionHeading>{t("admin_world.slides", "Slides")}</SectionHeading>
          {country.slides.length === 0 && (
            <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sumi-soft">
              {t("admin_world.no_slides", "No slides yet — learners go straight to picking an item.")}
            </p>
          )}
          {country.slides.map((slide, index) => (
            <EditWorldSlideForm key={slide.id} slide={slide} index={index} count={country.slides.length} />
          ))}
        </div>
        <div className="rounded-2xl border border-card-border bg-washi-soft p-6 lg:sticky lg:top-6">
          <h2 className="mb-4 font-semibold text-sumi">{t("admin_world.new_slide", "New slide")}</h2>
          <CreateWorldSlideForm countryId={country.id} />
        </div>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-3">
          <SectionHeading>{t("admin_world.items", "Items")}</SectionHeading>
          {country.items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sumi-soft">
              {t("admin_world.no_items", "No items yet — add some for learners to pick.")}
            </p>
          )}
          {country.items.map((item) => (
            <EditWorldItemForm key={item.id} item={item} />
          ))}
        </div>
        <div className="rounded-2xl border border-card-border bg-washi-soft p-6 lg:sticky lg:top-6">
          <h2 className="mb-4 font-semibold text-sumi">{t("admin_world.new_item", "New item")}</h2>
          <CreateWorldItemForm countryId={country.id} />
        </div>
      </section>
    </div>
  );
}
