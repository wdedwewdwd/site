"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  compareJ,
  faNum,
  jLong,
  jalaliDayNumber,
  jalaliMonthLength,
  MONTHS,
  WEEKDAYS_SHORT,
  weekdayIndex,
  type JDate,
} from "@/lib/jalali";

export type Preset = { key: string; label: string };

type Props = {
  from: JDate;
  to: JDate;
  today: JDate;
  activePreset: string | null;
  presets: readonly Preset[];
  onPreset: (key: string) => void;
  onRange: (from: JDate, to: JDate) => void;
};

const sameDay = (a: JDate | null, b: JDate | null) => !!a && !!b && compareJ(a, b) === 0;
const nextMonth = (y: number, m: number, delta: number) => {
  const idx = y * 12 + (m - 1) + delta;
  return { jy: Math.floor(idx / 12), jm: (idx % 12) + 1 };
};

export function JalaliRangePicker({ from, to, today, activePreset, presets, onPreset, onRange }: Props) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<JDate | null>(null);
  const [end, setEnd] = useState<JDate | null>(null);
  const [hover, setHover] = useState<JDate | null>(null);
  // The right-hand (first) visible month; the second month is the one after it.
  const [view, setView] = useState(() => nextMonth(to.jy, to.jm, -1));
  const rootRef = useRef<HTMLDivElement>(null);

  const openPicker = () => {
    setStart(from);
    setEnd(to);
    setHover(null);
    setView(nextMonth(to.jy, to.jm, -1));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (d: JDate) => {
    if (!start || end) {
      setStart(d);
      setEnd(null);
    } else if (compareJ(d, start) < 0) {
      setEnd(start);
      setStart(d);
    } else {
      setEnd(d);
    }
  };

  const apply = () => {
    if (!start) return;
    onRange(start, end ?? start);
    setOpen(false);
  };

  const selEnd = end ?? (start && hover && compareJ(hover, start) >= 0 ? hover : start);
  const selStart = end ? start : start && hover && compareJ(hover, start) < 0 ? hover : start;
  const days = start ? jalaliDayNumber(selEnd ?? start) - jalaliDayNumber(selStart ?? start) + 1 : 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-white px-4 text-sm font-bold shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-subtle"
      >
        <CalendarDays className="size-5 text-brand" aria-hidden />
        <span>{jLong(from)}</span>
        {compareJ(from, to) !== 0 && (
          <>
            <span className="text-muted">تا</span>
            <span>{jLong(to)}</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="انتخاب بازه زمانی"
          className="absolute right-0 top-full z-50 mt-2 flex w-[min(92vw,720px)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl md:flex-row"
        >
          {/* Presets as rows (fastest path for the common ranges) */}
          <ul className="flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2 md:w-44 md:flex-col md:border-b-0 md:border-l">
            {presets.map((p) => (
              <li key={p.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onPreset(p.key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] ${
                    activePreset === p.key ? "font-extrabold text-ink" : "text-muted hover:bg-canvas hover:text-ink"
                  }`}
                >
                  {p.label}
                  {activePreset === p.key && <Check className="size-4 text-brand" strokeWidth={3} aria-hidden />}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between px-4 pt-4">
              <button type="button" aria-label="ماه قبل" onClick={() => setView((v) => nextMonth(v.jy, v.jm, -1))} className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
                <ChevronRight className="size-5" />
              </button>
              <span className="text-xs font-bold text-muted">روز شروع و پایان را انتخاب کنید</span>
              <button
                type="button"
                aria-label="ماه بعد"
                disabled={compareJ({ ...nextMonth(view.jy, view.jm, 1), jd: 1 }, { ...today, jd: 1 }) >= 0}
                onClick={() => setView((v) => nextMonth(v.jy, v.jm, 1))}
                className="grid size-8 place-items-center rounded-lg hover:bg-canvas disabled:opacity-30"
              >
                <ChevronLeft className="size-5" />
              </button>
            </div>

            <div className="grid gap-6 px-4 pb-2 pt-2 md:grid-cols-2">
              {[view, nextMonth(view.jy, view.jm, 1)].map((m, i) => (
                <Month
                  key={`${m.jy}-${m.jm}`}
                  jy={m.jy}
                  jm={m.jm}
                  today={today}
                  start={selStart}
                  end={selEnd}
                  className={i === 0 ? "hidden md:block" : ""}
                  onPick={pick}
                  onHover={setHover}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="text-xs text-muted">
                {start ? (
                  <>
                    <b className="text-ink">{jLong(selStart ?? start)}</b>
                    {selEnd && !sameDay(selStart, selEnd) && (
                      <>
                        {" "}تا <b className="text-ink">{jLong(selEnd)}</b>
                      </>
                    )}{" "}
                    ({faNum(days)} روز)
                  </>
                ) : (
                  "روز شروع را انتخاب کنید"
                )}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:bg-canvas">
                  انصراف
                </button>
                <button type="button" onClick={apply} disabled={!start} className="rounded-lg bg-brand px-5 py-2 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-50">
                  اعمال
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Month(props: {
  jy: number;
  jm: number;
  today: JDate;
  start: JDate | null;
  end: JDate | null;
  className?: string;
  onPick: (d: JDate) => void;
  onHover: (d: JDate | null) => void;
}) {
  const { jy, jm, today, start, end } = props;
  const len = jalaliMonthLength(jy, jm);
  const lead = weekdayIndex({ jy, jm, jd: 1 });
  const cells: (JDate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => ({ jy, jm, jd: i + 1 }))];

  return (
    <div className={props.className}>
      <p className="mb-2 text-center text-sm font-black">
        {MONTHS[jm - 1]} {faNum(jy)}
      </p>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-subtle">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="py-1">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7" onPointerLeave={() => props.onHover(null)}>
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const future = compareJ(d, today) > 0;
          const isStart = sameDay(d, start);
          const isEnd = sameDay(d, end);
          const inRange = !!start && !!end && compareJ(d, start) > 0 && compareJ(d, end) < 0;
          const edge = isStart || isEnd;
          return (
            <div key={d.jd} className={`py-0.5 ${inRange ? "bg-brand-soft" : ""} ${isStart && end && !isEnd ? "rounded-r-full bg-brand-soft" : ""} ${isEnd && start && !isStart ? "rounded-l-full bg-brand-soft" : ""}`}>
              <button
                type="button"
                disabled={future}
                onClick={() => props.onPick(d)}
                onPointerEnter={() => props.onHover(d)}
                aria-label={jLong(d)}
                aria-pressed={edge}
                className={`mx-auto grid size-9 place-items-center rounded-full text-[13px] transition-colors disabled:cursor-not-allowed disabled:text-line ${
                  edge ? "bg-brand font-black text-white" : inRange ? "font-bold text-brand" : "hover:bg-canvas"
                } ${sameDay(d, today) && !edge ? "ring-1 ring-brand/50" : ""}`}
              >
                {faNum(d.jd)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
