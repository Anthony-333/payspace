import { Store } from "lucide-react";
import { cn } from "cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-lg font-bold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-primary-foreground">
        <Store className="size-4.5" strokeWidth={2.4} />
      </span>
      Payspace
    </span>
  );
}
