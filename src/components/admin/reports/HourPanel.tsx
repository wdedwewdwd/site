"use client";

import { ColumnChart } from "./ColumnChart";

const nf = new Intl.NumberFormat("fa-IR");
const num = (n: number) => nf.format(n).replace(/٬/g, ",");
const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/** When customers buy: orders by hour of day and by weekday, in Tehran time. */
export function HourPanel({ hours, weekdays }: { hours: { hour: number; orders: number; revenue: number }[]; weekdays: { index: number; orders: number; revenue: number }[] }) {
  const peak = hours.reduce((b, h) => (h.orders > b.orders ? h : b), hours[0]);
  const peakDay = weekdays.reduce((b, d) => (d.orders > b.orders ? d : b), weekdays[0]);
  const any = hours.some((h) => h.orders > 0);

  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby="hours-title">
      <div className="flex flex-col gap-1">
        <h2 id="hours-title" className="text-base font-black">زمان خرید مشتریان (به وقت تهران)</h2>
        {any && (
          <p className="text-xs text-muted">
            پرسفارش‌ترین ساعت: <b className="text-ink">{num(peak.hour)} تا {num((peak.hour + 1) % 24)}</b> · پرسفارش‌ترین روز: <b className="text-ink">{WEEKDAYS[peakDay.index]}</b>
          </p>
        )}
      </div>
      {!any ? (
        <p className="grid h-40 place-items-center rounded-xl bg-canvas text-sm text-muted">داده‌ای برای نمایش وجود ندارد.</p>
      ) : (
        <>
          <ColumnChart
            height={200}
            label="تعداد سفارش بر اساس ساعت"
            data={hours.map((h) => ({
              label: num(h.hour),
              fullLabel: `ساعت ${num(h.hour)}:۰۰ تا ${num((h.hour + 1) % 24)}:۰۰`,
              value: h.orders,
              details: [{ label: "مبلغ", value: `${num(h.revenue)} تومان` }],
            }))}
            formatValue={(v) => `${num(v)} سفارش`}
          />
          <ul className="grid grid-cols-7 gap-1.5 text-center" aria-label="سفارش‌ها بر اساس روز هفته">
            {weekdays.map((d) => {
              const max = Math.max(1, ...weekdays.map((w) => w.orders));
              return (
                <li key={d.index} className="flex flex-col items-center gap-1.5">
                  <span className="relative h-16 w-full max-w-10 overflow-hidden rounded-md bg-surface">
                    <span className="absolute inset-x-0 bottom-0 rounded-t-md bg-brand" style={{ height: `${(d.orders / max) * 100}%` }} />
                  </span>
                  <span className="text-[10px] text-muted">{WEEKDAYS[d.index]}</span>
                  <span className="text-[11px] font-bold">{num(d.orders)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
