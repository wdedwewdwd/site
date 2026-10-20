"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A row of product cards that scrolls sideways: swipe on phones (cards snap into place), arrow buttons on desktop.
 * Children are the cards; each gets a width that shows 2 / 3 / 4 / 5 of them depending on the screen.
 */
export function ProductRail({ label, children }: { label: string; children: React.ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  // RTL: the row starts at the right, so scrollLeft goes from 0 towards negative numbers.
  const update = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = Math.abs(el.scrollLeft);
    setEdge({ start: x < 4, end: x > max - 4 });
  };
  useEffect(update, []);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: -dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow = "absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink shadow-lg transition-opacity hover:bg-canvas md:grid";
  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={update}
        role="list"
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 md:mx-0 md:gap-4 md:scroll-px-0 md:px-0"
      >
        {children.map((child, i) => (
          <div
            key={i}
            role="listitem"
            className="flex w-[44%] shrink-0 snap-start sm:w-[31%] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] [&>article]:w-full"
          >
            {child}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => go(-1)} aria-label="قبلی" className={`${arrow} -right-4 ${edge.start ? "pointer-events-none opacity-0" : ""}`}>
        <ChevronRight className="size-5" />
      </button>
      <button type="button" onClick={() => go(1)} aria-label="بعدی" className={`${arrow} -left-4 ${edge.end ? "pointer-events-none opacity-0" : ""}`}>
        <ChevronLeft className="size-5" />
      </button>
    </div>
  );
}
