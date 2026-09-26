"use client";

import { useTransition } from "react";
import { toggleProductActive } from "@/app/actions/admin/products";

export function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleProductActive(id))}
      className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${active ? "bg-success-soft text-success" : "bg-surface text-muted"} ${pending ? "opacity-50" : ""}`}
    >
      {active ? "فعال" : "غیرفعال"}
    </button>
  );
}
