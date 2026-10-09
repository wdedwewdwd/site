"use client";

import { useState } from "react";
import { ColumnChart } from "@/components/admin/reports/ColumnChart";

type Point = { key: string; label: string; fullLabel: string; views: number; visitors: number; sessions: number };
type Metric = "visitors" | "sessions" | "views";

const nf = new Intl.NumberFormat("fa-IR");
const num = (n: number) => nf.format(n).replace(/٬/g, ",");

const METRICS: Record<Metric, { title: string; unit: string }> = {
  visitors: { title: "بازدیدکننده", unit: "بازدیدکننده" },
  sessions: { title: "ورود به سایت", unit: "ورود" },
  views: { title: "بازدید صفحه", unit: "بازدید" },
};

/** Visitors, visits (sessions) or page views over time — the traffic twin of the sales chart. */
export function TrafficPanel({ series, granularityLabel }: { series: Point[]; granularityLabel: string }) {
  const [metric, setMetric] = useState<Metric>("visitors");
  const [showTable, setShowTable] = useState(false);
  const empty = series.every((s) => s.views === 0);
  const best = series.reduce<Point | null>((b, s) => (!b || s[metric] > b[metric] ? s : b), null);
  const m = METRICS[metric];

  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby="traffic-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="traffic-title" className="text-base font-black">
            {m.title} ({granularityLabel})
          </h2>
          {best && best[metric] > 0 && (
            <p className="text-xs text-muted">
              بیشترین: <b className="text-ink">{best.fullLabel}</b> با {num(best[metric])} {m.unit}
            </p>
          )}
        </div>
        <div role="radiogroup" aria-label="شاخص نمودار" className="flex rounded-lg bg-canvas p-1 text-xs font-bold">
          {(Object.keys(METRICS) as Metric[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={metric === k}
              onClick={() => setMetric(k)}
              className={`rounded-md px-3 py-1.5 ${metric === k ? "bg-white text-ink shadow-sm" : "text-muted"}`}
            >
              {METRICS[k].title}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <p className="grid h-64 place-items-center rounded-xl bg-canvas text-sm text-muted">در این بازه بازدیدی ثبت نشده است.</p>
      ) : (
        <ColumnChart
          label={`نمودار ${m.title} ${granularityLabel}`}
          data={series.map((s) => ({
            label: s.label,
            fullLabel: s.fullLabel,
            value: s[metric],
            details: (Object.keys(METRICS) as Metric[])
              .filter((k) => k !== metric)
              .map((k) => ({ label: METRICS[k].title, value: num(s[k]) })),
          }))}
          formatValue={(v) => `${num(v)} ${m.unit}`}
        />
      )}

      <div className="border-t border-line pt-3">
        <button type="button" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable} className="text-xs font-bold text-info hover:underline">
          {showTable ? "بستن جدول" : "نمایش جدول داده‌ها"}
        </button>
        {showTable && (
          <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-line">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-canvas text-muted">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">بازه</th>
                  <th className="px-3 py-2 text-right font-bold">بازدیدکننده</th>
                  <th className="px-3 py-2 text-right font-bold">ورود به سایت</th>
                  <th className="px-3 py-2 text-right font-bold">بازدید صفحه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line" style={{ fontVariantNumeric: "tabular-nums" }}>
                {series.map((s) => (
                  <tr key={s.key}>
                    <td className="px-3 py-2">{s.fullLabel}</td>
                    <td className="px-3 py-2 font-bold">{num(s.visitors)}</td>
                    <td className="px-3 py-2">{num(s.sessions)}</td>
                    <td className="px-3 py-2">{num(s.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
