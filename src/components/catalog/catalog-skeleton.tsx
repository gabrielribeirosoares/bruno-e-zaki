export function CatalogSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      data-testid="catalog-skeleton"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface-card overflow-hidden rounded-xl">
          <div className="shimmer aspect-4/3 bg-muted" />
          <div className="space-y-3 p-4">
            <div className="shimmer h-5 w-3/4 rounded bg-muted" />
            <div className="shimmer h-4 w-full rounded bg-muted" />
            <div className="flex items-center justify-between pt-2">
              <div className="shimmer h-6 w-24 rounded bg-muted" />
              <div className="shimmer h-9 w-28 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div data-testid="table-skeleton" className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="shimmer h-14 w-full rounded-lg bg-muted" />
      ))}
    </div>
  );
}
