"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { passwordProblem, usernameProblem } from "@/convex/lib/loyalty";
import { errorMessage } from "@/lib/errors";

// Opening a card (name, username, password) and resetting a card's password share this form.
// The password is shown once here, for staff to hand over, and never again.

const password = z.string().superRefine((v, ctx) => {
  const problem = passwordProblem(v);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});
const createSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer's name.").max(60, "Up to 60 characters."),
  username: z.string().superRefine((v, ctx) => {
    const problem = usernameProblem(v);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  }),
  password,
});
const resetSchema = z.object({ name: z.string(), username: z.string(), password });
type Values = z.infer<typeof createSchema>;

/** Easy to read aloud and type on a phone: no 0/O or 1/l/I. */
function suggestPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const word = Array.from(bytes.slice(0, 6), (b) => letters[b % letters.length]).join("");
  const num = Array.from(bytes.slice(6), (b) => digits[b % digits.length]).join("");
  return `${word}-${num}`;
}

type Props =
  | { mode: "create"; open: boolean; onClose: (cardId?: Id<"loyaltyCards">) => void }
  | { mode: "reset"; open: boolean; card: { _id: Id<"loyaltyCards">; name: string; username: string }; onClose: () => void };

export function CredentialsDialog(props: Props) {
  const shop = useShop();
  const create = useMutation(api.loyalty.createCard);
  const reset = useMutation(api.loyalty.resetPassword);
  const [show, setShow] = useState(true);
  const form = useForm<Values>({
    resolver: zodResolver(props.mode === "create" ? createSchema : resetSchema),
    defaultValues: { name: "", username: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const { open, mode } = props;

  useEffect(() => {
    if (open) {
      form.reset({ name: "", username: "", password: suggestPassword() });
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (props.mode === "create") {
        const cardId = await create({ tenantId: shop.tenantId, name: values.name, username: values.username, password: values.password });
        toast.success(`Card opened for ${values.name}. Give them their username and password.`);
        props.onClose(cardId);
      } else {
        await reset({ tenantId: shop.tenantId, cardId: props.card._id, password: values.password });
        toast.success(`New password set for @${props.card.username}. They've been signed out everywhere.`);
        props.onClose();
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "New loyalty card" : `Reset password for ${props.mode === "reset" ? props.card.name : ""}`}</DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? `The customer sees their card at payspace.shop/loyalty/${shop.slug}/<username>, signing in with this password.`
                : "Customers can't change their own password. Give them this new one; their old one stops working now."}
            </DialogDescription>
          </DialogHeader>

          {mode === "create" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="lc-name">Customer&apos;s name</Label>
                <Input id="lc-name" className="h-11" autoComplete="off" placeholder="Ana Reyes" {...form.register("name")} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lc-username">Username</Label>
                <Input id="lc-username" className="h-11" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="ana.reyes" {...form.register("username")} />
                <FieldError message={errors.username?.message} />
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="lc-password">{mode === "create" ? "Password" : "New password"}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="lc-password"
                  type={show ? "text" : "password"}
                  className="h-11 pr-11 font-mono"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" className="h-11" onClick={() => form.setValue("password", suggestPassword(), { shouldValidate: true })}>
                <RefreshCw className="size-4" /> New
              </Button>
            </div>
            <FieldError message={errors.password?.message} />
            <p className="text-xs text-muted-foreground">Write it down for the customer now; it can&apos;t be shown again.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => props.onClose()}>Cancel</Button>
            <Button type="submit" className="h-11" disabled={isSubmitting}>{mode === "create" ? "Open card" : "Set password"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
