"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { faDigits } from "@/lib/format";

const GIVE_UP_MS = 120_000;

/**
 * Opens the print dialog by itself once every photo on the sheet has loaded (or after two minutes),
 * showing progress meanwhile. Used when the price list is opened from the "PDF" export menu.
 */
export function AutoPrint({ enabled }: { enabled: boolean }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const imgs = [...document.querySelectorAll<HTMLImageElement>("[data-print-sheet] img")];
      const done = imgs.filter((i) => i.complete).length;
      setProgress({ done, total: imgs.length });
      if (done === imgs.length || Date.now() - started > GIVE_UP_MS) {
        window.clearInterval(timer);
        setProgress(null);
        // Let the last photos paint before the print preview is taken.
        window.setTimeout(() => window.print(), 300);
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [enabled]);

  if (!progress) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white shadow-lg print:hidden">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      آماده‌سازی عکس‌ها برای PDF… {faDigits(progress.done)} از {faDigits(progress.total)}
    </div>
  );
}
