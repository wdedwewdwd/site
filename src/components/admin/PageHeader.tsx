import { BackButton } from "@/components/layout/BackButton";

/** Admin page title row. With `backHref`, shows a back button that returns to the parent list. */
export function PageHeader({ title, backHref, children }: { title: string; backHref?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-xl font-black md:text-2xl">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        {backHref && <BackButton fallback={backHref} variant="pill" />}
      </div>
    </div>
  );
}
