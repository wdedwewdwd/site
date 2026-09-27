import { PageBar } from "@/components/layout/PageBar";

export function ContentPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
      <PageBar title={title} backHref="/" />
      <article className="card mx-auto w-full max-w-4xl p-6 md:p-10">
        <header className="mb-6 border-b border-line pb-5">
          <h1 className="text-xl font-black md:text-2xl">{title}</h1>
          {updated && <p className="mt-2 text-xs text-muted">آخرین به‌روزرسانی: {updated}</p>}
        </header>
        <div className="prose-fa flex flex-col gap-4 text-sm leading-8 text-ink [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-black [&_li]:mr-5 [&_li]:list-disc [&_a]:font-bold [&_a]:text-brand">
          {children}
        </div>
      </article>
    </div>
  );
}
