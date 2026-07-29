import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Single library / marketplace mascot card. */
export function MascotCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04]",
        className
      )}
    >
      <Skeleton className="h-[220px] w-full rounded-none bg-[#0c1322]/80" />
      <div className="space-y-2 border-t border-white/10 p-4">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/** Grid of mascot cards (library / marketplace first page). */
export function MascotCardGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <MascotCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Compact rows for admin marketplace listings. */
export function AdminListingRowsSkeleton({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div className="mt-6 grid gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full-page shell while auth / Suspense resolves — mimics header + content,
 * not a centered spinner.
 */
export function PageShellSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]",
        className
      )}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="border-b border-white/10 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Skeleton className="h-7 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8 lg:px-12">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-10 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <Skeleton className="mt-3 h-4 w-2/3 max-w-sm" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <MascotCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * Studio detail loading chrome: site header + thin action toolbar + stage.
 * Matches marketplace / library / create / remix studio shells.
 */
export function StudioPageSkeleton({
  withHeaderActions = true,
  variant = "site-header",
}: {
  withHeaderActions?: boolean;
  variant?: "pills" | "site-header";
}) {
  return (
    <div
      className="relative min-h-screen bg-[var(--brand-bg)]"
      aria-busy="true"
      aria-label="Loading"
    >
      {variant === "site-header" ? (
        <div className="border-b border-white/10 px-5 py-4 sm:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Skeleton className="h-7 w-28 bg-white/10" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-md bg-white/10" />
              <Skeleton className="h-8 w-20 rounded-md bg-white/10" />
            </div>
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-3 sm:px-8">
        <Skeleton className="h-8 w-28 rounded-full bg-white/10" />
        {withHeaderActions && (
          <>
            <Skeleton className="h-8 w-24 rounded-full bg-white/10" />
            <Skeleton className="h-8 w-28 rounded-full bg-white/10" />
          </>
        )}
      </div>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Skeleton className="mb-4 h-14 w-72 max-w-full bg-white/10" />
        <Skeleton className="h-[min(70vh,560px)] w-full rounded-[1.5rem] bg-white/[0.04]" />
      </div>
    </div>
  );
}

/** Create brief: model picker grid (two providers × three options). */
export function ModelPickerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading models">
      {Array.from({ length: 2 }, (_, group) => (
        <div key={group}>
          <Skeleton className="mb-2 h-3 w-20" />
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-3/4" />
                <Skeleton className="mt-3 h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Remix form: model chip row. */
export function ModelChipsSkeleton() {
  return (
    <div className="mt-4 space-y-4" aria-busy="true" aria-label="Loading models">
      {Array.from({ length: 2 }, (_, group) => (
        <div key={group}>
          <Skeleton className="mb-2 h-3 w-16" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Create samples step while regenerating concepts. */
export function SampleConceptsSkeleton() {
  return (
    <div
      className="grid gap-5 md:grid-cols-3"
      aria-busy="true"
      aria-label="Loading concepts"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03]"
        >
          <Skeleton className="min-h-[280px] w-full rounded-none bg-[#0c1322]/80" />
          <div className="space-y-2 border-t border-white/10 p-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Checkout success “confirming…” panel. */
export function CheckoutConfirmSkeleton() {
  return (
    <div
      className="flex w-full flex-col items-center gap-4"
      aria-busy="true"
      aria-label="Confirming purchase"
    >
      <Skeleton className="size-12 rounded-full" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="mt-4 h-10 w-40 rounded-md" />
    </div>
  );
}

/** Pricing / home teaser price amount placeholder (span — safe inside `<p>`). */
export function PriceSkeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block animate-pulse rounded-md bg-white/[0.06] align-baseline",
        className
      )}
    />
  );
}
