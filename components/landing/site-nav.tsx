"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

function useNavLinks() {
  const t = useTranslations();
  return [
    { href: "/faq", label: t("home.footer.faq", "FAQ") },
    { href: "/about", label: t("footer.about", "About us") },
    { href: "/contact", label: t("footer.contact", "Contact us") },
    { href: "/partners", label: t("footer.partners", "Partner with us") },
  ];
}

// The info pages inline in the site header, from lg up (see SiteMobileMenu
// for smaller screens). The current page is marked.
export function SiteNavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  const links = useNavLinks();

  return (
    <nav className={cn("items-center gap-1", className)}>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition",
              active ? "bg-sumi/5 text-sumi" : "text-sumi-soft hover:text-sumi",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Below lg: a menu button that drops a panel under the header with the info
// pages — and, on phones, the theme toggle, which the header row has no
// room for there. Sits in the header's `relative` container.
export function SiteMobileMenu({ className }: { className?: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const links = useNavLinks();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={className}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="site-mobile-menu"
        aria-label={open ? t("nav.close_menu", "Close menu") : t("nav.open_menu", "Open menu")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sumi/15 text-sumi-soft transition hover:border-sumi/30 hover:text-sumi"
      >
        {open ? <X className="h-4.5 w-4.5" aria-hidden="true" /> : <Menu className="h-4.5 w-4.5" aria-hidden="true" />}
      </button>

      {open && (
        <div
          id="site-mobile-menu"
          className="absolute inset-x-0 top-full z-40 border-b border-header-border bg-header shadow-lg"
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3 sm:px-6">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-3 py-3 font-medium transition",
                    active ? "bg-sumi/5 text-sumi" : "text-sumi-soft hover:bg-sumi/5 hover:text-sumi",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center justify-between border-t border-sumi/10 px-3 pt-4 pb-1 sm:hidden">
              <span className="text-sm font-medium text-sumi-soft">
                {t("dashboard_layout.theme", "Theme")}
              </span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
