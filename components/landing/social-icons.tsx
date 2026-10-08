import { cn } from "@/lib/utils";
import { SOCIAL_LINKS } from "@/lib/site";

// lucide no longer ships brand icons, so these are drawn inline.
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  );
}

export function SocialLinks({ className }: { className?: string }) {
  const links = [
    { href: SOCIAL_LINKS.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: SOCIAL_LINKS.x, label: "X (Twitter)", Icon: XIcon },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sumi/15 text-sumi-soft transition hover:border-sumi/30 hover:text-sumi"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
