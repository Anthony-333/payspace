import { cn } from "cn";

// The pill label with an icon disc used on the landing page's bento cards.
export function Chip({
  icon: Icon,
  dark,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold",
        dark ? "bg-background/10" : "bg-card",
      )}
    >
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full",
          dark ? "bg-background text-foreground" : "bg-foreground text-background",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      {children}
    </span>
  );
}
