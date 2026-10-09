import { ArrowDownLeft, ArrowUpLeft, Minus } from "lucide-react";
import { change, compactNumber } from "./format";

const nf = new Intl.NumberFormat("fa-IR");
export const num = (n: number) => nf.format(n).replace(/٬/g, ",");

/** KPI tile: label · value · signed change vs the previous period of equal length. */
export function StatTile({
  label,
  value,
  unit,
  current,
  previous,
  upIsGood = true,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  current?: number;
  previous?: number;
  upIsGood?: boolean;
  hint?: string;
}) {
  const pct = current !== undefined && previous !== undefined ? change(current, previous) : undefined;
  const up = (pct ?? 0) > 0;
  const good = pct === 0 || pct == null ? null : up === upIsGood;
  return (
    <div className="card flex flex-col gap-2 p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-xl font-black md:text-2xl">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </span>
      {pct !== undefined && (
        <span className="flex items-center gap-1 text-[11px]">
          {pct === null ? (
            <span className="text-muted">دوره قبل: بدون داده</span>
          ) : (
            <>
              <span className={`flex items-center gap-0.5 font-bold ${good === null ? "text-muted" : good ? "text-success" : "text-brand"}`}>
                {pct === 0 ? <Minus className="size-3" /> : up ? <ArrowUpLeft className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
                {num(Math.abs(Math.round(pct)))}٪
              </span>
              <span className="text-muted">نسبت به دوره قبل</span>
            </>
          )}
        </span>
      )}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

/** Ranked list with a share bar per row (magnitude in one hue). */
export function BarList({
  title,
  rows,
  empty = "داده‌ای وجود ندارد.",
  unit = "تومان",
  hint,
}: {
  title: string;
  rows: { key: string; label: string; value: number; secondary?: string }[];
  empty?: string;
  /** What the values count, e.g. "تومان" or "ورود". */
  unit?: string;
  hint?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-black">{title}</h2>
        {hint && <p className="text-[11px] text-muted">{hint}</p>}
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate font-bold">{r.label}</span>
                <span className="shrink-0 text-xs text-muted">
                  <b className="text-ink">{compactNumber(r.value)}</b> {unit}
                  {total > 0 && <> · {num(Math.round((r.value / total) * 100))}٪</>}
                </span>
              </div>
              <span className="h-2 overflow-hidden rounded-full bg-surface">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
              </span>
              {r.secondary && <span className="text-[11px] text-muted">{r.secondary}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
