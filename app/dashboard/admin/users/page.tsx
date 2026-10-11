import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hasActiveAccess } from "@/lib/billing-status";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Users — Donguri",
};

const PAGE_SIZE = 50;

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

// Every signed-up account (guests aren't listed), newest first, searchable
// by email, username or name — with each one's access and a role picker
// for making someone a tester (full learning access, no admin abilities).
// Admins are shown but can't be changed here.
export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireAdminProfile();
  const { q = "", page: pageParam } = await searchParams;
  const query = q.trim();
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const where: Prisma.ProfileWhereInput = {
    isGuest: false,
    ...(query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
            { fullName: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total, { t, locale }] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        role: true,
        createdAt: true,
        subscription: { select: { status: true } },
      },
    }),
    prisma.profile.count({ where }),
    getTranslator(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const joined = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return `/dashboard/admin/users${search ? `?${search}` : ""}`;
  };

  // What the account can do right now, beside its role.
  const accessLabel = (user: (typeof users)[number]) => {
    if (user.role === "admin") return t("admin_users.access_admin", "Full access (admin)");
    if (user.role === "tester") return t("admin_users.access_tester", "Full access (tester)");
    if (hasActiveAccess(user.role, user.subscription)) return t("admin_users.access_member", "Member");
    return t("admin_users.access_free", "Free");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { href: "/dashboard/admin", label: t("admin_hub.title", "Admin") },
            { label: t("admin_users.title", "Users") },
          ]}
        />
        <PageTitle>{t("admin_users.title", "Users")}</PageTitle>
        <PageSubtitle>
          {t(
            "admin_users.subtitle",
            "Everyone with an account. Make someone a tester to give them full access to every course without a membership — testers can't use any admin tools.",
          )}
        </PageSubtitle>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full max-w-md items-center gap-2" action="/dashboard/admin/users">
          <label htmlFor="user-search" className="sr-only">
            {t("admin_users.search_label", "Search users")}
          </label>
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-sumi-soft" />
            <input
              id="user-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t("admin_users.search_placeholder", "Email, username or name")}
              className="w-full rounded-lg border border-sumi/15 bg-washi py-2 pr-3 pl-9 text-sm text-sumi outline-none transition focus:border-ai focus:ring-2 focus:ring-ai-soft"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-ai px-4 py-2 text-sm font-semibold text-washi transition hover:bg-ai-dark"
          >
            {t("admin_users.search", "Search")}
          </button>
        </form>
        <p className="text-sm text-sumi-soft">
          {t("admin_users.count", "{{count}} users", { count: total })}
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-card-border bg-washi-soft">
        {users.length === 0 ? (
          <p className="p-6 text-center text-sumi-soft">{t("admin_users.none", "No users match that search.")}</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sumi">
                    {user.fullName || user.email}
                    {user.username && <span className="ml-2 font-normal text-sumi-soft">@{user.username}</span>}
                  </p>
                  <p className="truncate text-sm text-sumi-soft">
                    {user.email} ·{" "}
                    {t("admin_users.joined", "Joined {{date}}", { date: joined.format(user.createdAt) })} ·{" "}
                    {accessLabel(user)}
                  </p>
                </div>
                <UserRoleSelect
                  userId={user.id}
                  role={user.role}
                  label={t("admin_users.role_for", "Role for {{name}}", { name: user.fullName || user.email })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label={t("admin_users.pages", "Pages")}>
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="inline-flex items-center gap-1 font-semibold text-sumi-soft hover:text-sumi">
              <ChevronLeft aria-hidden className="h-4 w-4" />
              {t("admin_users.previous", "Previous")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sumi-soft">
            {t("admin_users.page_of", "Page {{page}} of {{count}}", { page, count: pageCount })}
          </span>
          {page < pageCount ? (
            <Link href={pageHref(page + 1)} className="inline-flex items-center gap-1 font-semibold text-sumi-soft hover:text-sumi">
              {t("admin_users.next", "Next")}
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
