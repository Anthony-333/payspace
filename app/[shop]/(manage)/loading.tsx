import { PageBody } from "@/components/shop/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown the moment a rail item is tapped, for every back-office route that hasn't got a
 * skeleton of its own. Without this boundary the old screen sits frozen until the new one
 * has rendered on the server, which reads as the app hanging.
 */
export default function Loading() {
  return (
    <PageBody>
      <div className="mb-6 grid gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <span className="sr-only" role="status">Loading…</span>
    </PageBody>
  );
}
