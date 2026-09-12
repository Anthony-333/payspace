"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";

type Template = NonNullable<FunctionReturnType<typeof api.templates.available>>;

const COPY: Record<Template["businessType"], string> = {
  cafe: "drinks with sizes, milk options and add-ons, plus ingredients and recipes so you see profit per cup",
  bakery: "breads and pastries with ingredients and recipes, plus drinks",
  grocery: "everyday items in common categories. Add the rest from a CSV file",
  retail: "",
};

export function StarterTemplateCard({ template }: { template: Template }) {
  const shop = useShop();
  const apply = useMutation(api.templates.apply);
  const [busy, setBusy] = useState(false);

  async function onApply() {
    setBusy(true);
    try {
      const { products } = await apply({ tenantId: shop.tenantId });
      toast.success(`Added ${products} starter products. Edit prices and names to match your shop.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          Start with a starter menu
        </CardTitle>
        <CardDescription>
          {template.products} products: {COPY[template.businessType]}. You can edit or archive anything later.
        </CardDescription>
        <CardAction>
          <Button size="lg" onClick={onApply} disabled={busy}>
            {busy ? "Adding…" : "Add starter menu"}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
