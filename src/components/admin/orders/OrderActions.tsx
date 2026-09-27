"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Ban, Banknote, CheckCircle2, LoaderCircle, PackageCheck, RotateCcw, Truck, Undo2, Wrench } from "lucide-react";
import { changeOrderStatus, recordCodPayment, type OrderActionState } from "@/app/actions/admin/orders";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";
import { actionsFor, CANCEL_REASONS, CARRIERS, CARRIERS_WITHOUT_TRACKING, REFUND_REASONS, type OrderAction } from "@/lib/order-flow";
import type { OrderStatus } from "@/generated/prisma/client";

type Props = {
  orderId: string;
  number: string;
  status: OrderStatus;
  paymentMethod: "ONLINE" | "COD";
  hasPayment: boolean;
  total: string;
  carrier: string | null;
  trackingCode: string | null;
};

const ICONS: Partial<Record<OrderStatus, typeof Truck>> = {
  PAID: Banknote,
  PROCESSING: Wrench,
  SHIPPED: Truck,
  DELIVERED: PackageCheck,
  CANCELLED: Ban,
  REFUNDED: Undo2,
};

function useSuccess(state: OrderActionState, done: () => void) {
  const cb = useRef(done);
  useEffect(() => {
    cb.current = done;
  });
  useEffect(() => {
    if (state?.ok) {
      toast(state.message);
      cb.current();
    }
  }, [state]);
}

export function OrderActions(props: Props) {
  const [active, setActive] = useState<OrderAction | null>(null);
  const [codOpen, setCodOpen] = useState(false);
  const actions = actionsFor(props.status, { paidOnline: props.hasPayment, paymentMethod: props.paymentMethod });
  const showCod = props.paymentMethod === "COD" && !props.hasPayment && props.status !== "CANCELLED" && props.status !== "REFUNDED";

  return (
    <div className="flex flex-col gap-3">
      {actions.length === 0 && !showCod ? (
        <p className="rounded-lg bg-canvas p-3 text-xs text-muted">این سفارش بسته شده و اقدام دیگری ندارد.</p>
      ) : (
        <>
          {actions.map((a) => {
            const Icon = a.to === props.status ? RotateCcw : (ICONS[a.to] ?? CheckCircle2);
            return (
              <button
                key={a.to + a.label}
                type="button"
                onClick={() => setActive(a)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-right transition-colors ${
                  a.primary ? "border-brand bg-brand text-white hover:bg-brand-dark" : a.danger ? "border-line bg-white text-brand hover:bg-brand-soft" : "border-line bg-white hover:bg-canvas"
                }`}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="flex flex-col">
                  <span className="text-sm font-extrabold">{a.label}</span>
                  <span className={`text-[11px] ${a.primary ? "text-white/80" : "text-muted"}`}>{a.hint}</span>
                </span>
              </button>
            );
          })}
          {showCod && (
            <button type="button" onClick={() => setCodOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-success/40 bg-success-soft px-4 py-3 text-right text-success hover:bg-success-soft/70">
              <Banknote className="size-5 shrink-0" aria-hidden />
              <span className="flex flex-col">
                <span className="text-sm font-extrabold">ثبت دریافت وجه در محل</span>
                <span className="text-[11px]">وقتی مأمور ارسال مبلغ {props.total} تومان را دریافت کرد.</span>
              </span>
            </button>
          )}
        </>
      )}

      <Modal open={!!active} onClose={() => setActive(null)} title={active ? `${active.label} — سفارش #${props.number}` : ""} description={active?.hint}>
        {active && <ActionForm key={active.to + active.label} action={active} {...props} onDone={() => setActive(null)} />}
      </Modal>
      <Modal open={codOpen} onClose={() => setCodOpen(false)} title={`ثبت دریافت وجه — سفارش #${props.number}`}>
        {codOpen && <CodForm orderId={props.orderId} total={props.total} onDone={() => setCodOpen(false)} />}
      </Modal>
    </div>
  );
}

function ActionForm({ action, orderId, carrier, trackingCode, paymentMethod, hasPayment, total, onDone }: Props & { action: OrderAction; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(changeOrderStatus, null);
  const [chosenCarrier, setChosenCarrier] = useState(carrier ?? "");
  useSuccess(state, onDone);
  const reasons = action.kind === "cancel" ? CANCEL_REASONS : action.kind === "refund" ? REFUND_REASONS : null;
  const needsTracking = action.kind === "ship" && !CARRIERS_WITHOUT_TRACKING.includes(chosenCarrier);
  const offerCod = action.to === "DELIVERED" && paymentMethod === "COD" && !hasPayment;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="to" value={action.to} />

      {action.kind === "ship" && (
        <>
          <div>
            <label htmlFor="carrier" className="label">روش ارسال *</label>
            <select id="carrier" name="carrier" required value={chosenCarrier} onChange={(e) => setChosenCarrier(e.target.value)} className="input">
              <option value="" disabled>انتخاب کنید</option>
              {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tracking" className="label">کد رهگیری مرسوله {needsTracking ? "*" : "(اختیاری)"}</label>
            <input id="tracking" name="trackingCode" defaultValue={trackingCode ?? ""} dir="ltr" inputMode="numeric" maxLength={40} className="input" required={needsTracking} />
          </div>
        </>
      )}

      {reasons && (
        <div>
          <label htmlFor="reason" className="label">علت *</label>
          <select id="reason" name="reason" required defaultValue="" className="input">
            <option value="" disabled>انتخاب کنید</option>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {action.kind === "payment" && (
        <div>
          <label htmlFor="reference" className="label">شماره پیگیری یا مرجع واریز (اختیاری)</label>
          <input id="reference" name="reference" maxLength={80} dir="ltr" className="input" />
        </div>
      )}

      {offerCod && (
        <label className="flex items-start gap-2 rounded-xl border border-success/40 bg-success-soft p-3 text-sm text-success">
          <input type="checkbox" name="codCollected" defaultChecked className="mt-0.5 size-4 shrink-0 accent-brand" />
          <span>
            <b>مبلغ {total} تومان در محل دریافت شد</b>
            <span className="block text-[11px]">پرداخت این سفارش هم‌زمان ثبت می‌شود. اگر هنوز پول را نگرفته‌اید، تیک را بردارید.</span>
          </span>
        </label>
      )}

      <div>
        <label htmlFor="note" className="label">توضیح (اختیاری)</label>
        <textarea id="note" name="note" rows={2} maxLength={500} className="input resize-none" placeholder="در تاریخچه سفارش ثبت می‌شود" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="size-4 accent-brand" />
        اطلاع‌رسانی به مشتری (اعلان در حساب کاربری)
      </label>

      {state && !state.ok && <p className="rounded-lg bg-brand-soft p-3 text-sm font-bold text-brand" role="alert">{state.message}</p>}
      <div className="flex flex-wrap gap-3 border-t border-line pt-4">
        <button type="submit" disabled={pending} className={`btn ${action.danger ? "bg-brand text-white hover:bg-brand-dark" : "btn-primary"}`}>
          {pending && <LoaderCircle className="size-4 animate-spin" />} تأیید و ثبت
        </button>
        <button type="button" onClick={onDone} className="btn-ghost">انصراف</button>
      </div>
    </form>
  );
}

function CodForm({ orderId, total, onDone }: { orderId: string; total: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(recordCodPayment, null);
  useSuccess(state, onDone);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-sm">مبلغ دریافتی: <b>{total} تومان</b></p>
      <div>
        <label htmlFor="cod-ref" className="label">شماره پیگیری کارتخوان (اختیاری)</label>
        <input id="cod-ref" name="reference" maxLength={80} dir="ltr" className="input" />
      </div>
      {state && !state.ok && <p className="rounded-lg bg-brand-soft p-3 text-sm font-bold text-brand" role="alert">{state.message}</p>}
      <div className="flex gap-3 border-t border-line pt-4">
        <button type="submit" disabled={pending} className="btn-primary">{pending && <LoaderCircle className="size-4 animate-spin" />} ثبت دریافت وجه</button>
        <button type="button" onClick={onDone} className="btn-ghost">انصراف</button>
      </div>
    </form>
  );
}
