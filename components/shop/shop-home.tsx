"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { errorMessage } from "@/lib/errors";

// Week 1 app shell: shop switcher, sign-out, and a small categories panel that
// exercises the tenant wrapper end to end. The sidebar and real pages come later.
export function ShopHome() {
  const shop = useShop();
  const router = useRouter();
  const shops = useQuery(api.tenants.mine, {});
  const categories = useQuery(api.categories.list, { tenantId: shop.tenantId });
  const createCategory = useMutation(api.categories.create);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canEdit = shop.role === "owner" || shop.role === "manager";

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createCategory({ tenantId: shop.tenantId, name });
      setName("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{shop.name}</h1>
          <p className="text-sm capitalize text-muted-foreground">Signed in as {shop.role}</p>
        </div>
        <Button variant="outline" onClick={signOut}>Sign out</Button>
      </header>

      {shops && shops.length > 1 && (
        <nav aria-label="Your shops" className="flex flex-wrap gap-2">
          {shops.map((s) => (
            <Button key={s.tenantId} variant={s.slug === shop.slug ? "default" : "outline"} asChild>
              <Link href={`/${s.slug}`}>{s.name}</Link>
            </Button>
          ))}
        </nav>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Group your products, like Coffee, Pastries or Drinks.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {categories === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c._id} className="rounded-md border px-3 py-2 text-sm">{c.name}</li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form onSubmit={onAdd} className="flex gap-2">
              <Input
                aria-label="New category name"
                placeholder="New category"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" disabled={!name.trim()}>Add</Button>
            </form>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
