"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LoaderCircle, Pencil } from "lucide-react";
import { saveAdminNote, updateShippingInfo, type OrderActionState } from "@/app/actions/admin/orders";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";
import { PROVINCES } from "@/lib/iran";

type Shipping = { receiverName: string; receiverPhone: string; province: string; city: string; postalCode: string | null; fullAddress: string };

export function ShippingEditButton({ orderId, shipping }: { orderId: string; shipping: Shipping }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs font-bold text-info hover:underline">
        <Pencil className="size-3.5" /> ویرایش
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="ویرایش اطلاعات ارسال" description="مثلاً برای ثبت کد پستی پس از تماس با مشتری." size="lg">
        {open && <ShippingForm orderId={orderId} shipping={shipping} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

function ShippingForm({ orderId, shipping, onDone }: { orderId: string; shipping: Shipping; onDone: () => void }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(updateShippingInfo, null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (state?.ok) {
      toast(state.message);
      done.current();
    }
  }, [state]);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="flex flex-col gap-1.5 text-xs font-bold">نام گیرنده<input name="receiverName" defaultValue={shipping.receiverName} required className="input" /></label>
      <label className="flex flex-col gap-1.5 text-xs font-bold">موبایل گیرنده<input name="receiverPhone" defaultValue={shipping.receiverPhone} dir="ltr" required className="input" /></label>
      <label className="flex flex-col gap-1.5 text-xs font-bold">استان
        <select name="province" defaultValue={shipping.province} className="input">
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-bold">شهر<input name="city" defaultValue={shipping.city} required className="input" /></label>
      <label className="flex flex-col gap-1.5 text-xs font-bold sm:col-span-2">نشانی کامل<textarea name="fullAddress" defaultValue={shipping.fullAddress} rows={3} required className="input resize-none" /></label>
      <label className="flex flex-col gap-1.5 text-xs font-bold">کد پستی (۱۰ رقم)<input name="postalCode" defaultValue={shipping.postalCode ?? ""} dir="ltr" inputMode="numeric" maxLength={11} className="input" /></label>
      {state && !state.ok && <p className="rounded-lg bg-brand-soft p-3 text-sm font-bold text-brand sm:col-span-2" role="alert">{state.message}</p>}
      <div className="flex gap-3 border-t border-line pt-4 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending && <LoaderCircle className="size-4 animate-spin" />} ذخیره</button>
        <button type="button" onClick={onDone} className="btn-ghost">انصراف</button>
      </div>
    </form>
  );
}

export function AdminNoteForm({ orderId, note }: { orderId: string; note: string | null }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(saveAdminNote, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <textarea
        name="adminNote"
        defaultValue={note ?? ""}
        rows={3}
        maxLength={2000}
        placeholder="مثلاً: مشتری تماس گرفت، ارسال بعد از ساعت ۵ عصر"
        aria-label="یادداشت داخلی"
        className="input resize-y"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
          {pending ? "در حال ذخیره..." : "ذخیره یادداشت"}
        </button>
        {state && <span className={`text-xs font-bold ${state.ok ? "text-success" : "text-brand"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
