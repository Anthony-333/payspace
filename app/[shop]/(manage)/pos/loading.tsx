import { Skeleton } from "@/components/ui/skeleton";

/** The checkout screen has its own shape (tiles, then the order panel), so it gets its own skeleton. */
export default function Loading() {
  return (
    <div className="flex lg:h-[calc(100dvh-4.5rem)]">
      <div className="min-w-0 flex-1 overflow-hidden p-4 pb-28 sm:p-6 lg:pb-6">
        <div className="flex gap-3 overflow-hidden pb-1 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-40 shrink-0 rounded-xl sm:w-auto" />
          ))}
        </div>
        <Skeleton className="mt-6 h-6 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
      <aside className="hidden w-96 shrink-0 border-l p-5 lg:block">
        <Skeleton className="h-7 w-32" />
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-32 rounded-xl" />
      </aside>
      <span className="sr-only" role="status">Loading the checkout…</span>
    </div>
  );
}
