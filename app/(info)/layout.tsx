import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { getTranslator } from "@/lib/i18n/server";

// The public info pages — FAQ, about, contact and partners — share the home
// page's header and footer. The group's folder name isn't part of the URL.
export default async function InfoLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getTranslator();

  return (
    <div className="flex min-h-screen flex-col bg-washi">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter t={t} />
    </div>
  );
}
