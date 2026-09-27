import Image from "next/image";
import { cn } from "cn";

/** The Payspace wordmark. Pass `eager` when it sits above the fold. */
export function Logo({ className, eager }: { className?: string; eager?: boolean }) {
  return (
    <Image
      src="/brand/payspace-logo.png"
      alt="Payspace"
      width={602}
      height={100}
      loading={eager ? "eager" : undefined}
      className={cn("h-7 w-auto", className)}
    />
  );
}
