"use client";

import { useEffect, useId, useRef, useState } from "react";
import { compactNumber } from "./format";

export type Column = { label: string; fullLabel: string; value: number; details?: { label: string; value: string }[] };

type Props = {
  data: Column[];
  /** Formats the tooltip headline value. */
  formatValue: (v: number) => string;
  height?: number;
  /** Accessible name, e.g. "نمودار فروش روزانه". */
  label: string;
  /** Show at most this many x labels (auto-thinned to fit). */
  color?: string;
};

const PAD = { top: 16, right: 60, bottom: 30, left: 8 };

/** Nice round axis ticks (0, 250k, 500k …). */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** Rounded-top column: 4px radius at the data end, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function ColumnChart({ data, formatValue, height = 280, label, color = "var(--color-brand)" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const band = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(24, band * 0.62));
  // Right-to-left time axis: the first (oldest) bucket sits at the right edge.
  const cx = (i: number) => PAD.left + innerW - (i + 0.5) * band;
  const yOf = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 64))));

  const onKey = (e: React.KeyboardEvent) => {
    if (!data.length) return;
    // In RTL, ArrowLeft moves forward in time.
    if (e.key === "ArrowLeft") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowRight") setActive((a) => Math.max(0, (a ?? data.length) - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(data.length - 1);
    else return;
    e.preventDefault();
  };

  const tip = active !== null ? data[active] : null;
  const tipX = active !== null ? cx(active) : 0;

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        // max-w-full: the first render (before the box is measured) must not stretch its card on phones.
        className="block max-w-full overflow-visible outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <title id={titleId}>{label}</title>
        {/* Gridlines + y ticks (right side in RTL) */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={yOf(t)} y2={yOf(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={width - 4} y={yOf(t)} dy="0.35em" textAnchor="end" className="fill-subtle text-[11px]" style={{ fontVariantNumeric: "tabular-nums" }}>
              {compactNumber(t)}
            </text>
          </g>
        ))}

        {active !== null && <line x1={tipX} x2={tipX} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-subtle)" strokeWidth={1} />}

        {data.map((d, i) => {
          const h = (d.value / top) * innerH;
          const x = cx(i) - barW / 2;
          return (
            <g key={i}>
              {d.value > 0 && (
                <path
                  d={columnPath(x, PAD.top + innerH - h, barW, h)}
                  fill={color}
                  opacity={active === null || active === i ? 1 : 0.45}
                  className="transition-opacity"
                />
              )}
              {/* Hit target: the whole band, taller than the mark */}
              <rect
                x={cx(i) - band / 2}
                y={PAD.top}
                width={band}
                height={innerH + PAD.bottom}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onPointerMove={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
              />
              {i % labelEvery === 0 && (
                <text x={cx(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--color-subtle)" strokeWidth={1} />
      </svg>

      {tip && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 min-w-44 -translate-x-1/2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-right shadow-lg"
          style={{ left: Math.min(Math.max(tipX, 96), width - 96), top: 4 }}
        >
          <p className="text-base font-black">{formatValue(tip.value)}</p>
          <p className="text-[11px] text-muted">{tip.fullLabel}</p>
          {tip.details && tip.details.length > 0 && (
            <dl className="mt-2 flex flex-col gap-1 border-t border-line pt-2 text-[11px]">
              {tip.details.map((x) => (
                <div key={x.label} className="flex justify-between gap-4">
                  <dt className="text-muted">{x.label}</dt>
                  <dd className="font-bold">{x.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
