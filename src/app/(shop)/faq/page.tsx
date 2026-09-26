import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = { title: "سوالات متداول" };

export default async function FaqPage() {
  const faqs = await db.faq.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
      <Breadcrumbs items={[{ label: "سوالات متداول" }]} />
      <div className="card mx-auto w-full max-w-4xl p-6 md:p-10">
        <h1 className="mb-6 text-xl font-black md:text-2xl">سوالات متداول</h1>
        <div className="flex flex-col gap-3">
          {faqs.map((f) => (
            <details key={f.id} className="group rounded-card border border-line open:border-brand/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-extrabold">
                {f.question}
                <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-8 text-muted">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
