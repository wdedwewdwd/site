"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { faDigits } from "@/lib/format";

export const BULK_FORM = "bulk-print";
const boxes = () => [...document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name=n][form=${BULK_FORM}]`)];
const unique = (list: HTMLInputElement[]) => new Set(list.map((b) => b.value)).size;

/**
 * "Select all" + "print selected" for the order list. The row checkboxes are plain server-rendered
 * inputs tied to this form, so the batch page opens with ?n=…&n=… in a new tab. Each order is drawn
 * twice (phone card and desktop row); both copies are kept in sync and counted once.
 * Give it a key that changes with the list so a new page of results starts unselected.
 */
export function BulkPrintBar({ rows }: { rows: number }) {
  const [counts, setCounts] = useState({ selected: 0, total: rows });

  useEffect(() => {
    const sync = () => {
      const all = boxes();
      setCounts({ selected: unique(all.filter((b) => b.checked)), total: unique(all) });
    };
    const onChange = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || t.name !== "n" || t.getAttribute("form") !== BULK_FORM) return;
      for (const b of boxes()) if (b.value === t.value) b.checked = t.checked;
      sync();
    };
    sync();
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);

  const toggleAll = (checked: boolean) => {
    for (const b of boxes()) b.checked = checked;
    setCounts((c) => ({ ...c, selected: checked ? c.total : 0 }));
  };

  if (counts.total === 0) return null;
  return (
    <form
      id={BULK_FORM}
      action="/admin/invoice/batch"
      method="get"
      target="_blank"
      onSubmit={(e) => {
        // Send each order once, even though both of its checkboxes are ticked.
        e.preventDefault();
        const numbers = new Set(boxes().filter((b) => b.checked).map((b) => b.value));
        window.open(`/admin/invoice/batch?${[...numbers].map((n) => `n=${encodeURIComponent(n)}`).join("&")}`, "_blank");
      }}
      className="mb-3 flex flex-wrap items-center gap-3 text-[13px]"
    >
      <label className="flex cursor-pointer items-center gap-2 font-bold">
        <input
          type="checkbox"
          checked={counts.selected > 0 && counts.selected === counts.total}
          onChange={(e) => toggleAll(e.target.checked)}
          className="size-4 accent-brand"
        />
        انتخاب همه این صفحه
      </label>
      <button
        type="submit"
        disabled={counts.selected === 0}
        className="flex h-9 items-center gap-2 rounded-lg bg-ink px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Printer className="size-4" aria-hidden />
        {counts.selected ? `چاپ فاکتور و برچسب ${faDigits(counts.selected)} سفارش` : "برای چاپ گروهی، سفارش‌ها را تیک بزنید"}
      </button>
    </form>
  );
}
