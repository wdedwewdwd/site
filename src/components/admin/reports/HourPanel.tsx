"use client";

import { ColumnChart } from "./ColumnChart";

const nf = new Intl.NumberFormat("fa-IR");
const num = (n: number) => nf.format(n).replace(/٬/g, ",");
const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

type Props = {
  title: string;
  /** What is counted, e.g. "سفارش" or "بازدید". */
  unit: string;
  hours: { hour: number; value: number; details?: { label: string; value: string }[] }[];
  weekdays: { index: number; value: number }[];
};

/** When things happen: a count by hour of day and by weekday, in Tehran time (orders, visits…). */
export function HourPanel({ title, unit, hours, weekdays }: Props) {
  const peak = hours.reduce((b, h) => (h.value > b.value ? h : b), hours[0]);
  const peakDay = weekdays.reduce((b, d) => (d.value > b.value ? d : b), weekdays[0]);
  const any = hours.some((h) => h.value > 0);
  const max = Math.max(1, ...weekdays.map((w) => w.value));

  return (
    <section className="card flex flex-col gap-4 p-5" aria-label={title}>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-black">{title}</h2>
        {any && (
          <p className="text-xs text-muted">
            شلوغ‌ترین ساعت: <b className="text-ink">{num(peak.hour)} تا {num((peak.hour + 1) % 24)}</b> · شلوغ‌ترین روز: <b className="text-ink">{WEEKDAYS[peakDay.index]}</b>
          </p>
        )}
      </div>
      {!any ? (
        <p className="grid h-40 place-items-center rounded-xl bg-canvas text-sm text-muted">داده‌ای برای نمایش وجود ندارد.</p>
      ) : (
        <>
          <ColumnChart
            height={200}
            label={`تعداد ${unit} بر اساس ساعت`}
            data={hours.map((h) => ({
              label: num(h.hour),
              fullLabel: `ساعت ${num(h.hour)}:۰۰ تا ${num((h.hour + 1) % 24)}:۰۰`,
              value: h.value,
              details: h.details,
            }))}
            formatValue={(v) => `${num(v)} ${unit}`}
          />
          <ul className="grid grid-cols-7 gap-1.5 text-center" aria-label={`${unit} بر اساس روز هفته`}>
            {weekdays.map((d) => (
              <li key={d.index} className="flex flex-col items-center gap-1.5">
                <span className="relative h-16 w-full max-w-10 overflow-hidden rounded-md bg-surface">
                  <span className="absolute inset-x-0 bottom-0 rounded-t-md bg-brand" style={{ height: `${(d.value / max) * 100}%` }} />
                </span>
                <span className="text-[10px] text-muted">{WEEKDAYS[d.index]}</span>
                <span className="text-[11px] font-bold">{num(d.value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
