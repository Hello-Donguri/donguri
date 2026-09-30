import type { Metadata } from "next";
import { requireAdminProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { adminBadgeList } from "@/lib/badges";
import { CreateBadgeForm, EditBadgeForm } from "@/components/admin/badge-forms";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Badges — Donguri",
};

export default async function AdminBadgesPage() {
  await requireAdminProfile();
  const [badges, courses, { t }] = await Promise.all([
    adminBadgeList(),
    prisma.course.findMany({ orderBy: { position: "asc" }, select: { id: true, title: true } }),
    getTranslator(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { href: "/dashboard/admin", label: t("admin_hub.title", "Admin") },
            { label: t("admin_badges.title", "Badges") },
          ]}
        />
        <PageTitle>{t("admin_badges.title", "Badges")}</PageTitle>
        <PageSubtitle>
          {t(
            "admin_badges.subtitle",
            "Rewards learners earn by reaching a milestone. They're awarded, with a celebration, when the learner next returns to their dashboard or a course.",
          )}
        </PageSubtitle>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-3">
          {badges.length === 0 && (
            <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sumi-soft">
              {t("admin_badges.none", "No badges yet — create the first one.")}
            </p>
          )}
          {badges.map((badge) => (
            <EditBadgeForm key={badge.id} badge={badge} />
          ))}
        </div>

        <div className="rounded-2xl border border-card-border bg-washi-soft p-6 lg:sticky lg:top-6">
          <h2 className="mb-4 font-semibold text-sumi">{t("admin_badges.new", "New badge")}</h2>
          <CreateBadgeForm courses={courses} />
        </div>
      </div>
    </div>
  );
}
