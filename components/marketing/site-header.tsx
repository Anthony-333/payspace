import Link from "next/link";
import { Logo } from "./logo";

const NAV = [
  { href: "/#top", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
];

/** `current` is the NAV href to highlight; null highlights nothing (pages outside the nav). */
export function SiteHeader({ appHref, current = "/#top" }: { appHref: string | null; current?: string | null }) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" aria-label="Payspace home">
        <Logo eager />
      </Link>
      <nav aria-label="Main" className="hidden rounded-full bg-muted p-1 md:flex">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.href === current ? "page" : undefined}
            className={
              item.href === current
                ? "rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
                : "rounded-full px-5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            }
          >
            {item.label}
          </a>
        ))}
      </nav>
      <Link
        href={appHref ?? "/sign-in"}
        className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent"
      >
        {appHref ? "Open my shop" : "Sign in"}
      </Link>
    </header>
  );
}
