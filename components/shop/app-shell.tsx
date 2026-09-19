"use client";

import { useQuery } from "convex/react";
import {
  ChartLine,
  Boxes,
  Check,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Package,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tags,
  type LucideIcon,
} from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { canManage, useShop, type Shop } from "@/components/shop/shop-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  manageOnly?: boolean;
  ownerOnly?: boolean;
  exact?: boolean;
};

// Layout and look follow docs/design/blueprint.md.
const NAV: NavItem[] = [
  { href: "/pos", label: "Sell", icon: ShoppingBag },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "", label: "Dashboard", icon: LayoutDashboard, manageOnly: true, exact: true },
  { href: "/analytics", label: "Analytics", icon: ChartLine, manageOnly: true },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/categories", label: "Categories", icon: Tags, manageOnly: true },
  { href: "/modifiers", label: "Modifiers", icon: SlidersHorizontal, manageOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

/** Routes that put a search field in the top bar, and what it searches. */
const SEARCH_PLACEHOLDER: Record<string, string> = {
  "/pos": "Search the menu or scan a barcode",
  "/products": "Search by name or scan a barcode",
  "/inventory": "Search stock items",
  "/inventory/count": "Find an item to count",
};

type ShellSearch = {
  value: string;
  setValue: (value: string) => void;
  /** Sets what Enter does, which is how USB barcode scanners finish a scan. */
  setOnSubmit: (handler: (() => void) | null) => void;
  focus: () => void;
};
const SearchContext = createContext<ShellSearch | null>(null);

/** The top bar's search text, for pages listed in SEARCH_PLACEHOLDER. */
export function useShellSearch() {
  const search = useContext(SearchContext);
  if (!search) throw new Error("useShellSearch must be used inside AppShell");
  return search;
}

export function AppShell({ children }: { children: ReactNode }) {
  const shop = useShop();
  const pathname = usePathname();
  const base = `/${shop.slug}`;
  const section = pathname.slice(base.length);
  const [search, setSearch] = useState({ section, value: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const onSubmit = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Leaving a page clears its search.
  const value = search.section === section ? search.value : "";
  const setValue = (next: string) => setSearch({ section, value: next });
  const placeholder = SEARCH_PLACEHOLDER[section];

  const items = NAV.filter((item) =>
    (!item.manageOnly || canManage(shop.role)) && (!item.ownerOnly || shop.role === "owner"));
  const isActive = (item: NavItem) =>
    item.exact ? section === item.href : section === item.href || section.startsWith(`${item.href}/`);

  return (
    <SearchContext.Provider
      value={{
        value,
        setValue,
        setOnSubmit: (handler) => { onSubmit.current = handler; },
        focus: () => inputRef.current?.focus(),
      }}
    >
      <div className="flex min-h-dvh bg-background">
        {/* Rail */}
        <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-2 border-r bg-card py-5 md:flex">
          <Link href={base} aria-label={shop.name} className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-6" />
          </Link>
          <nav aria-label="Main" className="flex flex-col gap-2">
            {items.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={base + item.href}
                    aria-label={item.label}
                    aria-current={isActive(item) ? "page" : undefined}
                    className={cn(
                      "flex size-12 items-center justify-center rounded-xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      isActive(item) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <NavIcon icon={item.icon} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <SignOutButton compact />
          </div>
        </aside>

        {/* Phone menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-72 p-4">
            <SheetTitle className="mb-4 flex items-center gap-3 text-base">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Store className="size-5" />
              </span>
              {shop.name}
            </SheetTitle>
            <nav aria-label="Main" className="grid gap-1">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href={base + item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(item) ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                    isActive(item) ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  <NavIcon icon={item.icon} />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto">
              <SignOutButton />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-18 shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent md:hidden"
            >
              <Menu className="size-5" />
            </button>
            {placeholder ? (
              <div className="relative max-w-xl flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  ref={inputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSubmit.current?.();
                    }
                  }}
                  className="h-12 rounded-xl border-transparent bg-muted pl-12 text-sm shadow-none focus-visible:border-ring"
                />
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <ProfileMenu shop={shop} />
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </SearchContext.Provider>
  );
}

/**
 * A tapped nav item answers immediately: its icon becomes a spinner and a sliver of progress
 * runs across the top of the screen until the new route commits. Both are held back 140 ms
 * (see .nav-hint in globals.css), so an already-prefetched route never flashes one.
 *
 * useLinkStatus only reports for the <Link> it sits inside, which is why this is a child
 * component rather than shell state.
 */
function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus();
  if (!pending) return <Icon className="size-5" />;
  return (
    <>
      <LoaderCircle className="nav-hint size-5 animate-spin" />
      <span
        aria-hidden
        className="route-progress fixed inset-x-0 top-0 z-50 h-0.5 bg-primary"
      />
      <span className="sr-only" role="status">Loading…</span>
    </>
  );
}

/** Standard padding for back-office pages; the POS manages its own layout. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl p-4 sm:p-6", className)}>{children}</div>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";
}

function ProfileMenu({ shop }: { shop: Shop }) {
  const shops = useQuery(api.tenants.mine, {});
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-auto flex items-center gap-3 rounded-xl p-1 pr-2 text-left outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {initials(shop.memberName)}
        </span>
        <span className="hidden leading-tight sm:grid">
          <span className="text-base font-semibold">{shop.memberName}</span>
          <span className="text-xs capitalize text-muted-foreground">{shop.role} · {shop.name}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel>Your shops</DropdownMenuLabel>
        {(shops ?? []).map((s) => (
          <DropdownMenuItem key={s.tenantId} asChild>
            <Link href={`/${s.slug}`}>
              <span className="flex-1 truncate">{s.name}</span>
              {s.slug === shop.slug && <Check />}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding"><Plus /> Create another shop</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }
  if (!compact) {
    return (
      <button type="button" onClick={signOut} className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-destructive hover:bg-destructive/10">
        <LogOut className="size-5" /> Sign out
      </button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="flex size-12 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Sign out</TooltipContent>
    </Tooltip>
  );
}
