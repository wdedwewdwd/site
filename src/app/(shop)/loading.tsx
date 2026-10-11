/**
 * Shown the moment a shop link is clicked, until the next page arrives from the server
 * (prefetched with the link, so a click never feels like nothing happened).
 */
export default function ShopLoading() {
  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8" role="status" aria-label="در حال بارگذاری">
      <div className="h-4 w-40 animate-pulse rounded bg-surface" />
      <div className="h-7 w-56 animate-pulse rounded-lg bg-surface" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="card flex flex-col gap-3 p-3">
            <div className="aspect-[3/2] w-full animate-pulse rounded-xl bg-surface" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-surface" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
      <span className="sr-only">در حال بارگذاری…</span>
    </div>
  );
}
