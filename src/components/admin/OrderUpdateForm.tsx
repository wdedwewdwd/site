"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { updateOrder, type OrderUpdateState } from "@/app/actions/admin/orders";
import { ORDER_STATUS } from "@/lib/shop";
import type { OrderStatus } from "@/generated/prisma/client";

export function OrderUpdateForm({ orderId, status, trackingCode, next }: { orderId: string; status: OrderStatus; trackingCode: string | null; next: OrderStatus[] }) {
  const [state, action, pending] = useActionState<OrderUpdateState, FormData>(updateOrder, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label htmlFor="o-status" className="label">وضعیت سفارش</label>
        <select id="o-status" name="status" defaultValue={status} className="input">
          <option value={status}>{ORDER_STATUS[status].label} (فعلی)</option>
          {next.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="o-track" className="label">کد رهگیری مرسوله</label>
        <input id="o-track" name="trackingCode" dir="ltr" defaultValue={trackingCode ?? ""} maxLength={40} className="input" />
      </div>
      <div>
        <label htmlFor="o-note" className="label">یادداشت (اختیاری)</label>
        <input id="o-note" name="note" maxLength={300} className="input" />
      </div>
      {state && <p className={`text-xs font-bold ${state.ok ? "text-success" : "text-brand"}`} role="status">{state.ok ? state.message : state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending && <LoaderCircle className="size-4 animate-spin" />} ثبت تغییرات
      </button>
    </form>
  );
}
