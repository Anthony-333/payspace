import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INDUSTRIES } from "@/content/industries";
import { Logo } from "./logo";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
];

// Signed-out visitors get an email field that carries into sign-up; there is no mailing list.
export function SiteFooter({ appHref }: { appHref: string | null }) {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pt-12 pb-6 sm:px-6">
      <div className="rounded-[32px] bg-foreground px-6 py-12 text-background sm:px-12 sm:py-16 lg:px-20">
        <div className="grid items-end gap-8 lg:grid-cols-2">
          <div>
            <h2 className="max-w-lg text-4xl leading-tight font-medium tracking-tight sm:text-[2.75rem]">
              Know what you really made today
            </h2>
            <p className="mt-5 max-w-md text-background/70">
              Enter your email and set up your shop in minutes. Start free, and upgrade when profit per item pays for it.
            </p>
          </div>

          {appHref ? (
            <Link
              href={appHref}
              className="inline-flex items-center gap-3 justify-self-start rounded-full bg-primary py-2 pr-2 pl-6 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 lg:justify-self-end"
            >
              Open my shop
              <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-primary">
                <ArrowRight className="size-4" />
              </span>
            </Link>
          ) : (
            <form
              action="/sign-up"
              method="get"
              className="flex w-full max-w-md items-center gap-2 justify-self-start rounded-full border border-background/10 bg-background/5 p-1.5 lg:justify-self-end"
            >
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-background outline-none placeholder:text-background/50"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get started
              </button>
            </form>
          )}
        </div>

        <div className="mt-12 border-t border-background/10 pt-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <Link href="/" aria-label="Payspace home">
              <Logo className="brightness-0 invert" />
            </Link>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-background/90 hover:text-background">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <nav aria-label="Payspace for your business" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/pos" className="text-background/60 hover:text-background">
              POS for:
            </Link>
            {INDUSTRIES.map((i) => (
              <Link key={i.slug} href={`/pos/${i.slug}`} className="text-background/80 hover:text-background">
                {i.name}
              </Link>
            ))}
          </nav>
          <p className="mt-8 text-sm text-background/60">
            © {new Date().getFullYear()} Payspace. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
