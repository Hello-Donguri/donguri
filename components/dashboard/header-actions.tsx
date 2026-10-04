"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, BookOpen, Bug, ChevronDown, RotateCcw, CreditCard, Flame, GraduationCap, LogIn, LogOut, Mail, Menu, Settings, User, UserPlus, Users, X } from "lucide-react";
import { DonguriAvatar } from "@/components/icons/DonguriAvatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { useTranslations } from "@/components/i18n/locale-provider";
import { useDevMode } from "@/components/dashboard/dev-mode-context";
import { logout } from "@/lib/actions/auth";
import { resetDailyChallengeToday } from "@/lib/actions/daily-challenge";
import { sendTestCrownEmail, type TestEmailResult } from "@/lib/actions/dev-emails";
import { levelForXp, xpRangeForLevel, type AccessoryId } from "@/lib/levels";
import type { UserRole } from "@/lib/definitions";
import { cn } from "@/lib/utils";

type HeaderActionsProps = {
  profile: {
    fullName: string | null;
    email: string;
    role: UserRole;
    // Learning without an account (see lib/access.ts) — the menu offers
    // sign-up and log-in instead of account pages.
    isGuest: boolean;
  };
  equippedAccessory: AccessoryId | null;
  // Each enrolled course's current streak by slug (see `getCourseStreaks`
  // in lib/dal.ts) — streaks are per course; see `useHeaderStreak`.
  streaks: Record<string, number>;
  xp: number;
};

// The streak the header shows: the course you're in (from the URL), or —
// anywhere else, like the dashboard — your best current streak.
function useHeaderStreak(streaks: Record<string, number>): number {
  const pathname = usePathname();
  const slug = /^\/dashboard\/courses\/([^/]+)/.exec(pathname)?.[1];
  if (slug && slug in streaks) return streaks[slug];
  return Math.max(0, ...Object.values(streaks));
}

// Streak, then level + XP with a progress bar toward the next level — the
// header's at-a-glance progress summary. Refreshed with the rest of the
// layout after a quiz (see `refreshDashboardHeader` in lib/actions/vocab.ts).
// `compact` (the mobile row) shrinks it to a flame with the count inside and
// a bare level pill, so it fits beside the menu button.
function HeaderStats({
  currentStreak,
  xp,
  compact = false,
}: {
  currentStreak: number;
  xp: number;
  compact?: boolean;
}) {
  const t = useTranslations();
  const level = levelForXp(xp);
  const { min, max } = xpRangeForLevel(level);
  const progress = max === null ? 1 : (xp - min) / (max - min);
  const displayXp = Number.isInteger(xp) ? xp : xp.toFixed(1);

  if (compact) {
    const streakTitle = t("header_stats.streak_title", "{{count}} day streak", { count: currentStreak });
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="relative inline-flex h-9 w-9 items-center justify-center" title={streakTitle}>
          <Flame
            className={cn("h-9 w-9", currentStreak > 0 ? "fill-kin text-kin" : "text-sumi-soft")}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span
            className={cn(
              "absolute inset-x-0 bottom-1.5 text-center text-[11px] font-bold leading-none tabular-nums",
              currentStreak > 0 ? "text-washi" : "text-sumi-soft",
            )}
          >
            <span className="sr-only">{streakTitle}</span>
            <span aria-hidden="true">{currentStreak}</span>
          </span>
        </span>
        <span
          className="rounded-full bg-sumi px-2 py-0.5 text-xs font-bold whitespace-nowrap text-washi"
          title={`${displayXp}${max !== null ? ` / ${max}` : ""} ${t("xp_counter.xp", "XP")}`}
        >
          {t("xp_counter.level", "Lv {{level}}", { level })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <span
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-sumi"
        title={t("header_stats.streak_title", "{{count}} day streak", { count: currentStreak })}
      >
        <Flame
          className={cn("h-5 w-5", currentStreak > 0 ? "fill-kin text-kin" : "text-sumi-soft")}
          aria-hidden="true"
        />
        <span className="tabular-nums">{currentStreak}</span>
        <span className="hidden lg:inline">{t("header_stats.day_streak", "day streak")}</span>
      </span>

      <span className="hidden h-6 w-px bg-sumi/15 sm:block" aria-hidden="true" />

      <div className="inline-flex items-center gap-2 rounded-full border border-card-border bg-washi-soft py-1 pl-1 pr-3">
        <span className="rounded-full bg-sumi px-2 py-0.5 text-xs font-bold whitespace-nowrap text-washi">
          {t("xp_counter.level", "Lv {{level}}", { level })}
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium whitespace-nowrap text-sumi-soft">
            <span className="text-sm font-bold text-sumi tabular-nums">{displayXp}</span>
            {max !== null && ` / ${max}`} {t("xp_counter.xp", "XP")}
          </span>
          <span
            className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-sumi/10 sm:block"
            role="progressbar"
            aria-valuemin={min}
            aria-valuemax={max ?? xp}
            aria-valuenow={xp}
            aria-label={t("header_stats.progress_label", "Progress to next level")}
          >
            <span
              className="block h-full rounded-full bg-ai transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

// Closes a dropdown on an outside click or Escape — shared by the account
// and admin menus so their open/close behavior can't drift apart.
function useDismissableMenu(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return ref;
}

function AdminMenu({ role, className }: { role: UserRole; className?: string }) {
  const t = useTranslations();
  const { enabled: devModeEnabled, toggle: toggleDevMode } = useDevMode();
  const [open, setOpen] = useState(false);
  const ref = useDismissableMenu(open, () => setOpen(false));
  // The course in the URL, if any: the reset below clears just that one,
  // or every course from anywhere else.
  const courseSlug = /^\/dashboard\/courses\/([^/]+)/.exec(usePathname())?.[1] ?? null;
  const [resetStatus, setResetStatus] = useState<"idle" | "resetting" | "done" | "failed">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | TestEmailResult>("idle");

  if (role !== "admin") return null;

  const sendTestEmail = () => {
    if (emailStatus === "sending") return;
    setEmailStatus("sending");
    sendTestCrownEmail()
      .then(setEmailStatus)
      .catch(() => setEmailStatus({ ok: false, reason: "failed" }));
  };

  const resetChallenges = () => {
    if (resetStatus === "resetting") return;
    setResetStatus("resetting");
    resetDailyChallengeToday(courseSlug)
      .then((result) => setResetStatus(result.ok ? "done" : "failed"))
      .catch(() => setResetStatus("failed"));
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setResetStatus("idle");
          setEmailStatus("idle");
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        // Light mode: cream on the sage header, like the other header chips
        // (the red tint clashed with the sage). Dark mode keeps the red.
        className="inline-flex h-8 items-center gap-1 rounded-full border border-header-border bg-washi-soft px-3 text-xs font-semibold text-sumi transition hover:bg-raised dark:border-transparent dark:bg-shu/10 dark:font-medium dark:text-shu-dark dark:hover:bg-shu/15"
      >
        {t("dashboard_layout.role_admin", "Admin")}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border border-card-border bg-washi p-2 shadow-xl"
          >
            <Link
              href="/dashboard/admin/courses"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sumi transition hover:bg-sumi/5"
            >
              <GraduationCap className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
              {t("dashboard_home.course_management", "Course management")}
            </Link>
            <Link
              href="/dashboard/admin/reset-password"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sumi transition hover:bg-sumi/5"
            >
              <Users className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
              {t("dashboard_home.user_management", "User management")}
            </Link>
            <Link
              href="/dashboard/admin/badges"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sumi transition hover:bg-sumi/5"
            >
              <Award className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
              {t("admin_badges.title", "Badges")}
            </Link>

            <div className="my-1 border-t border-card-border" />

            {/* Clears your own attempts for today (and the XP they earned),
                so testing isn't capped at three a day. */}
            <button
              type="button"
              role="menuitem"
              onClick={resetChallenges}
              disabled={resetStatus === "resetting"}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sumi transition hover:bg-sumi/5 disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4 shrink-0 text-sumi-soft" aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                {t("admin_menu.reset_challenges", "Reset daily challenges")}
                <span className="text-xs font-normal text-sumi-soft">
                  {resetStatus === "resetting"
                    ? t("daily_challenge.dev_resetting", "Resetting…")
                    : resetStatus === "done"
                      ? t("admin_menu.reset_done", "Reset — today's attempts cleared.")
                      : resetStatus === "failed"
                        ? t("admin_menu.reset_failed", "Reset failed — check the server log.")
                        : courseSlug
                          ? t("admin_menu.reset_this_course", "Today's attempts in this course")
                          : t("admin_menu.reset_all_courses", "Today's attempts in all courses")}
                </span>
              </span>
            </button>

            {/* Dev mode only: the "regain your crown" email, to yourself,
                with made-up numbers — to see it in a real inbox and check
                the SMTP settings work. */}
            {devModeEnabled && (
              <button
                type="button"
                role="menuitem"
                onClick={sendTestEmail}
                disabled={emailStatus === "sending"}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sumi transition hover:bg-sumi/5 disabled:opacity-60"
              >
                <Mail className="h-4 w-4 shrink-0 text-sumi-soft" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  {t("admin_menu.test_crown_email", "Send test crown email")}
                  <span className="break-all text-xs font-normal text-sumi-soft">
                    {emailStatus === "sending"
                      ? t("admin_menu.test_email_sending", "Sending…")
                      : emailStatus === "idle"
                        ? t("admin_menu.test_email_hint", "\"Regain your crown\", to your email")
                        : emailStatus.ok
                          ? t("admin_menu.test_email_sent", "Sent to {{email}}", { email: emailStatus.to })
                          : emailStatus.reason === "not_configured"
                            ? t("admin_menu.test_email_not_configured", "Not sent — NO_REPLY_EMAIL_* isn't set.")
                            : t("admin_menu.test_email_failed", "Failed — check the server log.")}
                  </span>
                </span>
              </button>
            )}

            <div className="my-1 border-t border-card-border" />

            <button
              type="button"
              onClick={toggleDevMode}
              role="menuitemcheckbox"
              aria-checked={devModeEnabled}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sumi transition hover:bg-sumi/5"
            >
              <Bug className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
              {t("review_queue_dev.toggle", "Dev mode")}
              <span
                className={cn(
                  "ml-auto inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition",
                  devModeEnabled ? "border-kin bg-kin/60" : "border-ghost-border bg-ghost-hover",
                )}
              >
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded-full bg-washi shadow transition",
                    devModeEnabled ? "translate-x-4" : "translate-x-1",
                  )}
                />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Shared content between the desktop dropdown and the mobile sheet, so the
// two surfaces can't drift apart when a link or menu item changes. The
// mobile sheet passes `showThemeToggle` since there's no room for the toggle
// in the mobile header row.
function AccountLinks({
  onNavigate,
  isGuest,
  showThemeToggle = false,
}: {
  onNavigate: () => void;
  isGuest: boolean;
  showThemeToggle?: boolean;
}) {
  const t = useTranslations();

  return (
    <>
      <Link
        href="/dashboard/courses"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sumi transition hover:bg-sumi/5"
      >
        <BookOpen className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
        {t("dashboard_layout.courses", "Courses")}
      </Link>
      {isGuest ? (
        <>
          <Link
            href="/signup"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ai-dark transition hover:bg-ai/10"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t("dashboard_layout.guest_sign_up", "Sign up to save progress")}
          </Link>
          <Link
            href="/login"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sumi transition hover:bg-sumi/5"
          >
            <LogIn className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
            {t("nav.log_in", "Log in")}
          </Link>
        </>
      ) : (
        <AccountPageLinks onNavigate={onNavigate} />
      )}

      <div className="my-1 border-t border-card-border" />

      <div className="px-3 py-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sumi-soft">
          {t("dashboard_layout.language", "Language")}
        </p>
        <LocaleSwitcher />
      </div>

      {showThemeToggle && (
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sumi-soft">
            {t("dashboard_layout.theme", "Theme")}
          </p>
          <ThemeToggle />
        </div>
      )}

      {/* A guest logging out would lose what they've learnt. */}
      {!isGuest && (
        <>
          <div className="my-1 border-t border-card-border" />

          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-shu transition hover:bg-shu/10"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t("dashboard_layout.log_out", "Log out")}
            </button>
          </form>
        </>
      )}
    </>
  );
}

// Profile, settings and membership — only for real accounts.
function AccountPageLinks({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations();

  return (
    <>
      <Link
        href="/dashboard/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sumi transition hover:bg-sumi/5"
      >
        <User className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
        {t("dashboard_layout.profile", "Profile")}
      </Link>
      <Link
        href="/dashboard/settings"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sumi transition hover:bg-sumi/5"
      >
        <Settings className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
        {t("dashboard_layout.account_settings", "Account settings")}
      </Link>
      <Link
        href="/dashboard/billing"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sumi transition hover:bg-sumi/5"
      >
        <CreditCard className="h-4 w-4 text-sumi-soft" aria-hidden="true" />
        {t("dashboard_layout.membership", "Membership")}
      </Link>
    </>
  );
}

export function HeaderActions({ profile, equippedAccessory, streaks, xp }: HeaderActionsProps) {
  const t = useTranslations();
  const currentStreak = useHeaderStreak(streaks);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopRef = useDismissableMenu(desktopOpen, () => setDesktopOpen(false));

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [mobileOpen]);

  const displayName = profile.isGuest
    ? t("dashboard_layout.guest_name", "Guest")
    : (profile.fullName ?? profile.email);
  const subtitle = profile.isGuest
    ? t("dashboard_layout.guest_subtitle", "Not signed in")
    : profile.email;

  return (
    <>
      {/* Desktop */}
      <div className="hidden items-center gap-3 md:flex">
        <HeaderStats currentStreak={currentStreak} xp={xp} />
        <ThemeToggle />
        <AdminMenu role={profile.role} />

        <div ref={desktopRef} className="relative">
          <button
            type="button"
            onClick={() => setDesktopOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={desktopOpen}
            aria-label={t("dashboard_layout.account_menu", "Account menu")}
            className="block h-10 w-10 shrink-0 rounded-lg transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <DonguriAvatar equippedAccessory={equippedAccessory} className="h-10 w-10" />
          </button>

          <AnimatePresence>
            {desktopOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-card-border bg-washi p-2 shadow-xl"
              >
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <DonguriAvatar equippedAccessory={equippedAccessory} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-sumi">{displayName}</p>
                    <p className="truncate text-xs text-sumi-soft">{subtitle}</p>
                  </div>
                </div>

                <div className="my-1 border-t border-card-border" />

                <AccountLinks onNavigate={() => setDesktopOpen(false)} isGuest={profile.isGuest} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile */}
      <div className="relative z-50 flex items-center gap-2 md:hidden">
        <HeaderStats currentStreak={currentStreak} xp={xp} compact />
        <AdminMenu role={profile.role} />
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={mobileOpen}
          aria-label={
            mobileOpen
              ? t("dashboard_layout.close_menu", "Close menu")
              : t("dashboard_layout.open_menu", "Open menu")
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sumi/15 text-sumi transition hover:border-sumi/30"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-sumi/40 backdrop-blur-[1px] md:hidden"
              aria-hidden="true"
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-x-0 top-full z-50 border-b border-card-border bg-washi p-4 shadow-xl md:hidden"
            >
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <DonguriAvatar equippedAccessory={equippedAccessory} className="h-12 w-12 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sumi">{displayName}</p>
                  <p className="truncate text-xs text-sumi-soft">{subtitle}</p>
                </div>
              </div>

              <div className="my-1 border-t border-card-border" />

              <AccountLinks onNavigate={() => setMobileOpen(false)} isGuest={profile.isGuest} showThemeToggle />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
