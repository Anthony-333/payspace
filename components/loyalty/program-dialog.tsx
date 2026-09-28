"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import { CARD_COLORS } from "@/components/loyalty/card-colors";
import { StampCard } from "@/components/loyalty/stamp-card";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { LOYALTY_COLORS, STAMPS_MAX, STAMPS_MIN } from "@/convex/lib/loyalty";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Program = NonNullable<FunctionReturnType<typeof api.loyalty.program>["program"]>;

const schema = z.object({
  name: z.string().trim().min(2, "Name the card, like Coffee card.").max(40, "Up to 40 characters."),
  stampsRequired: z.coerce.number<string>().int("Use a whole number.").min(STAMPS_MIN, `At least ${STAMPS_MIN}.`).max(STAMPS_MAX, `At most ${STAMPS_MAX}.`),
  reward: z.string().trim().min(2, "Say what a full card earns.").max(80, "Up to 80 characters."),
  terms: z.string().trim().max(300, "Up to 300 characters."),
  color: z.enum(LOYALTY_COLORS),
  isActive: z.boolean(),
});
type Input = z.input<typeof schema>;
type Output = z.output<typeof schema>;

function defaults(program: Program | null): Input {
  return {
    name: program?.name ?? "Loyalty card",
    stampsRequired: String(program?.stampsRequired ?? 10),
    reward: program?.reward ?? "",
    terms: program?.terms ?? "",
    color: (program?.color as Input["color"]) ?? "teal",
    isActive: program?.isActive ?? true,
  };
}

/** The owner sets up the card: its name, how many stamps fill it, the reward and the colour. */
export function ProgramDialog({ open, program, onClose }: { open: boolean; program: Program | null; onClose: () => void }) {
  const shop = useShop();
  const save = useMutation(api.loyalty.saveProgram);
  const form = useForm<Input, unknown, Output>({ resolver: zodResolver(schema), defaultValues: defaults(program) });
  const { errors, isSubmitting } = form.formState;
  const preview = useWatch({ control: form.control });

  useEffect(() => {
    if (open) form.reset(defaults(program));
  }, [open, program, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save({ tenantId: shop.tenantId, ...values });
      toast.success("Loyalty card saved.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const previewStamps = Math.min(Math.max(Number(preview.stampsRequired) || 10, STAMPS_MIN), STAMPS_MAX);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{program ? "Edit loyalty card" : "Set up a loyalty card"}</DialogTitle>
            <DialogDescription>
              Customers earn one stamp per paid receipt. A new stamp count applies from each card&apos;s next round.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
            <div className="grid content-start gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lp-name">Card name</Label>
                <Input id="lp-name" className="h-11" {...form.register("name")} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lp-stamps">Stamps to fill a card</Label>
                <Input id="lp-stamps" inputMode="numeric" className="h-11 w-28 tabular-nums" {...form.register("stampsRequired")} />
                <FieldError message={errors.stampsRequired?.message} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lp-reward">Reward</Label>
                <Input id="lp-reward" className="h-11" placeholder="A free drink of your choice" {...form.register("reward")} />
                <FieldError message={errors.reward?.message} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lp-terms">Terms <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea id="lp-terms" rows={2} placeholder="One stamp per receipt. Not valid with other promos." {...form.register("terms")} />
                <FieldError message={errors.terms?.message} />
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Colour</legend>
                <Controller
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {LOYALTY_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={field.value === c}
                          aria-label={CARD_COLORS[c].label}
                          onClick={() => field.onChange(c)}
                          className={cn(
                            "size-11 rounded-full ring-offset-2 ring-offset-background transition",
                            field.value === c ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-border",
                          )}
                          style={{ backgroundColor: CARD_COLORS[c].bg }}
                        />
                      ))}
                    </div>
                  )}
                />
              </fieldset>
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                    <span className="grid gap-0.5">
                      <span className="text-sm font-medium">Loyalty is on</span>
                      <span className="text-xs text-muted-foreground">Off: no new cards or stamps. Customers can still see their cards.</span>
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
            </div>

            <div className="grid content-start gap-2">
              <p className="text-sm font-medium">Preview</p>
              <StampCard
                shopName={shop.name}
                cardName={preview.name || "Loyalty card"}
                reward={preview.reward || "Your reward"}
                color={preview.color ?? "teal"}
                stampsRequired={previewStamps}
                stamps={[]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="h-11" disabled={isSubmitting}>Save card</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
