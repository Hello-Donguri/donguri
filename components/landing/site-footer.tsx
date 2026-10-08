import Link from "next/link";
import { Logo } from "@/components/logo";
import { SocialLinks } from "@/components/landing/social-icons";
import type { TFunction } from "@/lib/i18n/translate";

// The public site's footer. The "How it works" and pricing links point at
// home-page sections, so they're written as "/#…" to work from any page.
export function SiteFooter({ t }: { t: TFunction }) {
  const columns = [
    {
      heading: t("footer.product", "Product"),
      links: [
        { href: "/#lessons", label: t("home.footer.how", "How it works") },
        { href: "/#pricing", label: t("home.footer.pricing", "Pricing") },
        { href: "/faq", label: t("home.footer.faq", "FAQ") },
      ],
    },
    {
      heading: t("footer.company", "Company"),
      links: [
        { href: "/about", label: t("footer.about", "About us") },
        { href: "/contact", label: t("footer.contact", "Contact us") },
        { href: "/partners", label: t("footer.partners", "Partner with us") },
      ],
    },
  ];

  return (
    <footer className="border-t border-sumi/10 px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="flex max-w-xs flex-col gap-4">
          <Logo />
          <p className="text-sm text-sumi-soft text-pretty">
            {t("footer.tagline", "Hello Donguri — English learning designed for Japanese speakers.")}
          </p>
          <SocialLinks />
        </div>

        <div className="grid grid-cols-2 gap-10 sm:gap-16">
          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-3 text-sm">
              <p className="font-semibold text-sumi">{column.heading}</p>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href} className="text-sumi-soft transition hover:text-sumi">
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-5xl border-t border-sumi/10 pt-6 text-xs text-sumi-soft">
        © Hello Donguri
      </p>
    </footer>
  );
}
