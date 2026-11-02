"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { addDays, compareJ, faNum, jKey, jLong, jalaliDayNumber, jalaliMonthLength, MONTHS, WEEKDAYS_SHORT, weekdayIndex, type JDate } from "@/lib/jalali";

type Preset = { label: string; days: number | null };

const DEFAULT_PRESETS: Preset[] = [
  { label: "۷ روز", days: 7 },
  { label: "۳۰ روز", days: 30 },
  { label: "۹۰ روز", days: 90 },
  { label: "بدون انقضا", days: null },
];

const shiftMonth = (y: number, m: number, delta: number) => {
  const idx = y * 12 + (m - 1) + delta;
  return { jy: Math.floor(idx / 12), jm: (idx % 12) + 1 };
};

/**
 * A single Jalali date in a form (sent as "1405-09-10", or "" for none). The calendar opens in place under the
 * field rather than floating, so it is never cut off inside a scrolling window. Days before `min` can't be picked,
 * except the field's own starting value (an old date stays as it is until changed). A form reset brings back the
 * starting value.
 */
export function JalaliDateField({
  name,
  defaultValue,
  today,
  min = today,
  emptyLabel = "بدون انقضا",
  presets = DEFAULT_PRESETS,
}: {
  name: string;
  defaultValue: JDate | null;
  today: JDate;
  min?: JDate;
  emptyLabel?: string;
  presets?: Preset[];
}) {
  const [value, setValue] = useState<JDate | null>(defaultValue);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({ jy: (defaultValue ?? today).jy, jm: (defaultValue ?? today).jm }));
  const inputRef = useRef<HTMLInputElement>(null);

  // form.reset() only resets real inputs; bring the picker back to its starting value too.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setValue(defaultValue);
      setOpen(false);
      setView({ jy: (defaultValue ?? today).jy, jm: (defaultValue ?? today).jm });
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, today]);

  const pick = (d: JDate | null) => {
    setValue(d);
    setOpen(false);
  };
  const daysLeft = value ? jalaliDayNumber(value) - jalaliDayNumber(today) : null;
  const len = jalaliMonthLength(view.jy, view.jm);
  const lead = weekdayIndex({ jy: view.jy, jm: view.jm, jd: 1 });
  const cells: (JDate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => ({ jy: view.jy, jm: view.jm, jd: i + 1 }))];
  const sameDay = (a: JDate | null, b: JDate | null) => !!a && !!b && compareJ(a, b) === 0;

  return (
    <div className="flex flex-col gap-2">
      <input ref={inputRef} type="hidden" name={name} value={value ? jKey(value) : ""} />
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="input flex flex-1 items-center gap-2 py-2 text-right"
        >
          <CalendarDays className="size-4 shrink-0 text-brand" aria-hidden />
          <span className={`flex-1 truncate ${value ? "font-bold text-ink" : "text-muted"}`}>
            {value ? `تا پایان ${jLong(value)}` : emptyLabel}
          </span>
          {value && daysLeft !== null && (
            <span className={`shrink-0 text-[11px] font-bold ${daysLeft < 0 ? "text-brand" : "text-muted"}`}>
              {daysLeft < 0 ? "گذشته" : daysLeft === 0 ? "امروز" : `${faNum(daysLeft)} روز دیگر`}
            </span>
          )}
          <ChevronDown className={`size-4 shrink-0 text-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {value && (
          <button type="button" onClick={() => pick(null)} aria-label="حذف تاریخ انقضا" title="بدون انقضا" className="grid w-10 shrink-0 place-items-center rounded-xl border border-line text-muted hover:bg-canvas hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-2xl border border-line bg-white p-3 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.35)]">
          <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => pick(p.days === null ? null : addDays(today, p.days))}
                className="shrink-0 rounded-lg bg-canvas px-3 py-1.5 text-xs font-bold text-ink hover:bg-brand-soft hover:text-brand"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="ماه قبل" onClick={() => setView((v) => shiftMonth(v.jy, v.jm, -1))} className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
              <ChevronRight className="size-5" />
            </button>
            <span className="text-sm font-black">{MONTHS[view.jm - 1]} {faNum(view.jy)}</span>
            <button type="button" aria-label="ماه بعد" onClick={() => setView((v) => shiftMonth(v.jy, v.jm, 1))} className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
              <ChevronLeft className="size-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-subtle">
            {WEEKDAYS_SHORT.map((w) => (
              <span key={w} className="py-1">{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const selected = sameDay(d, value);
              const blocked = compareJ(d, min) < 0 && !sameDay(d, defaultValue);
              return (
                <button
                  key={d.jd}
                  type="button"
                  disabled={blocked}
                  onClick={() => pick(d)}
                  aria-label={jLong(d)}
                  aria-pressed={selected}
                  className={`mx-auto grid size-9 place-items-center rounded-full text-[13px] transition-colors disabled:cursor-not-allowed disabled:text-line ${
                    selected ? "bg-brand font-black text-white" : "hover:bg-canvas"
                  } ${sameDay(d, today) && !selected ? "ring-1 ring-brand/50" : ""}`}
                >
                  {faNum(d.jd)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
