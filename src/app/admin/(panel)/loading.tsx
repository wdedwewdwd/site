/** Admin page outline shown instantly on every menu click, until the page's data arrives. */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="در حال بارگذاری">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="h-12 w-full animate-pulse rounded-card bg-info-soft/60" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card flex flex-col gap-3 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-surface" />
            <div className="h-7 w-24 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
      <div className="card flex flex-col divide-y divide-line">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="size-10 animate-pulse rounded-lg bg-surface" />
            <div className="h-4 flex-1 animate-pulse rounded bg-surface" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
      <span className="sr-only">در حال بارگذاری…</span>
    </div>
  );
}
