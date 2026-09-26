"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { createTicket, type TicketState } from "@/app/actions/support";
import { Field } from "@/components/ui/Field";
import { TICKET_CATEGORIES } from "@/lib/shop";

export function TicketForm({ orderRef }: { orderRef?: string }) {
  const [state, action, pending] = useActionState<TicketState, FormData>(createTicket, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2" noValidate>
      <Field label="موضوع" name="subject" required maxLength={100} error={e.subject} className="md:col-span-2" />
      <div>
        <label htmlFor="f-category" className="label">دسته‌بندی درخواست</label>
        <select id="f-category" name="category" className="input">
          {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <Field label="شماره سفارش (اختیاری)" name="orderRef" inputMode="numeric" dir="ltr" defaultValue={orderRef} maxLength={10} error={e.orderRef} />
      <div className="md:col-span-2">
        <label htmlFor="f-body" className="label">شرح درخواست</label>
        <textarea id="f-body" name="body" rows={6} maxLength={3000} required className="input resize-y" aria-invalid={!!e.body} />
        {e.body && <p className="field-error">{e.body}</p>}
      </div>
      {state?.error && <p className="field-error md:col-span-2" role="alert">{state.error}</p>}
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary min-w-40">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          ثبت تیکت
        </button>
      </div>
    </form>
  );
}
