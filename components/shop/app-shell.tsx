"use client";

import { useQuery } from "convex/react";
import { Check, ChevronsUpDown, House, LayoutGrid, LogOut, Package, Plus, SlidersHorizontal, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useShop } from "@/components/shop/shop-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

const NAV = [
  { href: "", label: "Home", icon: House },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/modifiers", label: "Modifiers", icon: SlidersHorizontal },
];

/** Back-office layout: sidebar with the shop switcher and navigation. The POS screen won't use it. */
export function AppShell({ children }: { children: ReactNode }) {
  const shop = useShop();
  const pathname = usePathname();
  const base = `/${shop.slug}`;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <ShopSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Catalog</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => {
                  const href = base + item.href;
                  const active = item.href === "" ? pathname === base : pathname.startsWith(href);
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={active} size="lg">
                        <Link href={href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SignOutButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-3 md:hidden">
          <SidebarTrigger className="size-10" />
          <span className="font-medium">{shop.name}</span>
        </header>
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ShopSwitcher() {
  const shop = useShop();
  const shops = useQuery(api.tenants.mine, {});
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="size-4" />
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-medium">{shop.name}</span>
            <span className="truncate text-xs capitalize text-muted-foreground">{shop.role}</span>
          </div>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
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
          <Link href="/onboarding">
            <Plus />
            Create another shop
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SignOutButton() {
  const router = useRouter();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/sign-in");
            router.refresh();
          }}
        >
          <LogOut />
          <span>Sign out</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
