"use client";

import { useActionState, useTransition } from "react";
import { TicketPercent, X } from "lucide-react";
import { applyDiscount, removeDiscount } from "@/app/actions/cart";

export function DiscountForm({ applied, error }: { applied: string | null; error: string | null }) {
  const [state, action, pending] = useActionState(applyDiscount, null);
  const [removing, startRemove] = useTransition();

  if (applied) {
    return (
      <div className="card flex items-center justify-between gap-3 p-4 text-sm">
        <span className="flex items-center gap-2">
          <TicketPercent className="size-5 text-success" />
          کد <b dir="ltr">{applied}</b> {error ? <span className="text-brand">— {error}</span> : "اعمال شد"}
        </span>
        <button type="button" disabled={removing} onClick={() => startRemove(() => removeDiscount().then(() => {}))} className="text-muted hover:text-brand" aria-label="حذف کد تخفیف">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="card flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <TicketPercent className="size-5 shrink-0 text-muted" aria-hidden />
        <label htmlFor="discount" className="sr-only">کد تخفیف</label>
        <input id="discount" name="code" maxLength={32} placeholder="کد تخفیف دارید؟ وارد کنید..." className="w-full bg-transparent text-sm focus:outline-none" autoComplete="off" dir="auto" />
        <button type="submit" disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-xs font-extrabold text-white disabled:opacity-60">
          اعمال
        </button>
      </div>
      {state && !state.ok && <p className="field-error" role="alert">{state.error}</p>}
    </form>
  );
}
