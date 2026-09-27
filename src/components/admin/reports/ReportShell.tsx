"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { jKey, type JDate } from "@/lib/jalali";
import { JalaliRangePicker, type Preset } from "./JalaliRangePicker";

type Props = {
  from: JDate;
  to: JDate;
  today: JDate;
  granularity: "day" | "week" | "month";
  preset: string | null;
  presets: readonly Preset[];
  children: React.ReactNode;
};

const GRANULARITY = [
  { key: "day", label: "روزانه" },
  { key: "week", label: "هفتگی" },
  { key: "month", label: "ماهانه" },
] as const;

/** Filter row + everything it scopes. While new data loads, the old render stays in place, dimmed. */
export function ReportShell({ from, to, today, granularity, preset, presets, children }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    start(() => router.push(`?${p.toString()}`, { scroll: false }));
  };

  const csvHref = `/api/admin/reports/sales?from=${jKey(from)}&to=${jKey(to)}&g=${granularity}`;

  return (
    <section aria-label="گزارش فروش" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <JalaliRangePicker
          from={from}
          to={to}
          today={today}
          activePreset={preset}
          presets={presets}
          onPreset={(key) => go({ p: key, from: null, to: null, g: null })}
          onRange={(f, t) => go({ p: null, from: jKey(f), to: jKey(t), g: null })}
        />
        <div role="radiogroup" aria-label="تفکیک زمانی" className="flex h-11 items-center rounded-xl border border-line bg-white p-1">
          {GRANULARITY.map((g) => (
            <button
              key={g.key}
              type="button"
              role="radio"
              aria-checked={granularity === g.key}
              onClick={() => go({ g: g.key })}
              className={`h-full rounded-lg px-3.5 text-[13px] font-bold transition-colors ${granularity === g.key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {pending && <LoaderCircle className="size-5 animate-spin text-muted" aria-label="در حال بارگذاری" />}
        <a href={csvHref} className="mr-auto flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-[13px] font-bold hover:bg-canvas">
          <Download className="size-4" aria-hidden />
          خروجی اکسل
        </a>
      </div>
      <div className={`flex flex-col gap-5 transition-opacity ${pending ? "pointer-events-none opacity-50" : ""}`}>{children}</div>
    </section>
  );
}
