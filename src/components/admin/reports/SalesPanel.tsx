"use client";

import { useState } from "react";
import { ColumnChart } from "./ColumnChart";
import { compactNumber } from "./format";

type Point = { key: string; label: string; fullLabel: string; revenue: number; orders: number; items: number };

const nf = new Intl.NumberFormat("fa-IR");
const num = (n: number) => nf.format(n).replace(/٬/g, ",");

export function SalesPanel({ series, granularityLabel }: { series: Point[]; granularityLabel: string }) {
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const [showTable, setShowTable] = useState(false);
  const empty = series.every((s) => s.orders === 0);
  const best = series.reduce<Point | null>((b, s) => (!b || s.revenue > b.revenue ? s : b), null);

  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby="sales-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="sales-title" className="text-base font-black">
            {metric === "revenue" ? "مبلغ فروش" : "تعداد سفارش"} ({granularityLabel})
          </h2>
          {best && best.revenue > 0 && (
            <p className="text-xs text-muted">
              بیشترین فروش: <b className="text-ink">{best.fullLabel}</b> با {compactNumber(best.revenue)} تومان
            </p>
          )}
        </div>
        <div role="radiogroup" aria-label="شاخص نمودار" className="flex rounded-lg bg-canvas p-1 text-xs font-bold">
          {(
            [
              ["revenue", "مبلغ فروش"],
              ["orders", "تعداد سفارش"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={metric === k}
              onClick={() => setMetric(k)}
              className={`rounded-md px-3 py-1.5 ${metric === k ? "bg-white text-ink shadow-sm" : "text-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <p className="grid h-64 place-items-center rounded-xl bg-canvas text-sm text-muted">در این بازه فروشی ثبت نشده است.</p>
      ) : (
        <ColumnChart
          label={`نمودار ${metric === "revenue" ? "مبلغ فروش" : "تعداد سفارش"} ${granularityLabel}`}
          data={series.map((s) => ({
            label: s.label,
            fullLabel: s.fullLabel,
            value: metric === "revenue" ? s.revenue : s.orders,
            details:
              metric === "revenue"
                ? [
                    { label: "سفارش", value: num(s.orders) },
                    { label: "قطعه فروخته‌شده", value: num(s.items) },
                  ]
                : [
                    { label: "مبلغ فروش", value: `${num(s.revenue)} تومان` },
                    { label: "قطعه فروخته‌شده", value: num(s.items) },
                  ],
          }))}
          formatValue={(v) => (metric === "revenue" ? `${num(v)} تومان` : `${num(v)} سفارش`)}
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
                  <th className="px-3 py-2 text-right font-bold">سفارش</th>
                  <th className="px-3 py-2 text-right font-bold">قطعه</th>
                  <th className="px-3 py-2 text-right font-bold">مبلغ فروش (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line" style={{ fontVariantNumeric: "tabular-nums" }}>
                {series.map((s) => (
                  <tr key={s.key}>
                    <td className="px-3 py-2">{s.fullLabel}</td>
                    <td className="px-3 py-2">{num(s.orders)}</td>
                    <td className="px-3 py-2">{num(s.items)}</td>
                    <td className="px-3 py-2 font-bold">{num(s.revenue)}</td>
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
