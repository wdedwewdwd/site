"use client";

import { useTransition } from "react";
import { setProductAvailability } from "@/app/actions/admin/products";
import { toast } from "@/components/ui/Toaster";

/** «موجود» / «ناموجود» in the product list; one click switches it. */
export function AvailabilityButton({ id, inStock, name }: { id: string; inStock: boolean; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      title={inStock ? "برای ناموجود کردن بزنید" : "برای موجود کردن بزنید"}
      aria-label={`${name}: ${inStock ? "موجود" : "ناموجود"}. برای تغییر بزنید`}
      onClick={() =>
        start(async () => {
          const res = await setProductAvailability(id, !inStock);
          toast(res.message, res.ok ? "success" : "error");
        })
      }
      className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-opacity ${inStock ? "bg-success-soft text-success" : "bg-brand-soft text-brand"} ${pending ? "opacity-50" : ""}`}
    >
      {inStock ? "موجود" : "ناموجود"}
    </button>
  );
}
