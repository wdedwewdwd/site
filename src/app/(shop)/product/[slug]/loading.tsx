/** Product page outline shown instantly while the product loads. */
export default function ProductLoading() {
  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8" role="status" aria-label="در حال بارگذاری محصول">
      <div className="h-4 w-64 animate-pulse rounded bg-surface" />
      <div className="grid gap-6 md:grid-cols-[1fr_1.1fr] md:gap-10">
        <div className="card p-4">
          <div className="aspect-[3/2] w-full animate-pulse rounded-xl bg-surface" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-5 w-32 animate-pulse rounded-full bg-surface" />
          <div className="h-8 w-4/5 animate-pulse rounded-lg bg-surface" />
          <div className="h-4 w-48 animate-pulse rounded bg-surface" />
          <div className="card flex items-center justify-between p-5">
            <div className="h-7 w-28 animate-pulse rounded bg-surface" />
            <div className="h-11 w-40 animate-pulse rounded-xl bg-surface" />
          </div>
          <div className="h-5 w-40 animate-pulse rounded bg-surface" />
          <div className="h-16 w-full animate-pulse rounded-xl bg-surface" />
        </div>
      </div>
      <span className="sr-only">در حال بارگذاری…</span>
    </div>
  );
}
