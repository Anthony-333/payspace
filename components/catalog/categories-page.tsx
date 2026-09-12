"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, Check, Pencil, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shop/page-header";
import { canManage, useShop } from "@/components/shop/shop-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";

export function CategoriesPage() {
  const shop = useShop();
  const tenantId = shop.tenantId;
  const manage = canManage(shop.role);
  const categories = useQuery(api.categories.list, { tenantId });
  const create = useMutation(api.categories.create);
  const rename = useMutation(api.categories.rename);
  const move = useMutation(api.categories.move);
  const remove = useMutation(api.categories.remove);

  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: Doc<"categories">["_id"]; name: string } | null>(null);
  const [deleting, setDeleting] = useState<Doc<"categories"> | null>(null);

  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      if (success) toast.success(success);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (await run(() => create({ tenantId, name }))) setName("");
  }

  async function onRename(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (await run(() => rename({ tenantId, categoryId: editing.id, name: editing.name }))) setEditing(null);
  }

  return (
    <>
      <PageHeader title="Categories" description="They become the tabs on your checkout screen, in this order." />

      {manage && (
        <form onSubmit={onAdd} className="mb-4 flex max-w-xl gap-2">
          <Input
            aria-label="New category name"
            placeholder="New category, like Pastries"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
          />
          <Button type="submit" size="lg" className="h-11" disabled={!name.trim()}>Add</Button>
        </form>
      )}

      <ul className="max-w-xl divide-y rounded-xl border bg-card">
        {categories === undefined ? (
          <li className="p-4 text-sm text-muted-foreground">Loading…</li>
        ) : categories.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">No categories yet.</li>
        ) : categories.map((category, index) => (
          <li key={category._id} className="flex min-h-14 items-center gap-2 px-3 py-2">
            {editing?.id === category._id ? (
              <form onSubmit={onRename} className="flex flex-1 items-center gap-2">
                <Input
                  autoFocus
                  aria-label="Category name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                  className="h-10"
                />
                <Button type="submit" size="icon-lg" aria-label="Save name"><Check /></Button>
                <Button type="button" variant="ghost" size="icon-lg" aria-label="Cancel" onClick={() => setEditing(null)}>
                  <X />
                </Button>
              </form>
            ) : (
              <>
                <span className="flex-1 truncate">{category.name}</span>
                {manage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon-lg" aria-label={`Move ${category.name} up`} disabled={index === 0}
                      onClick={() => run(() => move({ tenantId, categoryId: category._id, direction: "up" }))}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost" size="icon-lg" aria-label={`Move ${category.name} down`}
                      disabled={index === categories.length - 1}
                      onClick={() => run(() => move({ tenantId, categoryId: category._id, direction: "down" }))}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost" size="icon-lg" aria-label={`Rename ${category.name}`}
                      onClick={() => setEditing({ id: category._id, name: category.name })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost" size="icon-lg" aria-label={`Delete ${category.name}`}
                      onClick={() => setDeleting(category)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Only empty categories can be deleted. Move its products to another category first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleting && run(() => remove({ tenantId, categoryId: deleting._id }), `Deleted ${deleting.name}.`)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
