"use client";

import { useTransition } from "react";
import { toggleDiscount } from "@/app/actions/admin/misc";

export function DiscountToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleDiscount(id))}
      className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${active ? "bg-success-soft text-success" : "bg-surface text-muted"}`}
    >
      {active ? "فعال" : "غیرفعال"}
    </button>
  );
}
