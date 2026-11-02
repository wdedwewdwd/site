"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { cancelMyOrder, reorder } from "@/app/actions/orders";
import { faDigits } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";

/** «لغو سفارش» for an unpaid order, after a confirmation window. */
export function CancelOrderButton({ orderId, number, className = "btn-ghost px-4 py-2.5 text-sm" }: { orderId: string; number: number; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <XCircle className="size-4" aria-hidden />
        لغو سفارش
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={`لغو سفارش #${faDigits(number)}`} description="این سفارش هنوز پرداخت نشده است. بعد از لغو، کالاها از سفارش خارج می‌شوند و برای خرید دوباره باید سفارش جدید ثبت کنید.">
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className="btn-ghost px-5 py-2.5 text-sm">
            انصراف
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await cancelMyOrder(orderId);
                if (!res.ok) {
                  toast(res.error, "error");
                  return;
                }
                toast(res.message);
                setOpen(false);
                router.refresh();
              })
            }
            className="btn-primary px-5 py-2.5 text-sm"
          >
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            بله، لغو شود
          </button>
        </div>
      </Modal>
    </>
  );
}

/** «خرید مجدد»: the order's items go back into the cart, then the cart opens. */
export function ReorderButton({ orderId, className = "btn-ghost px-4 py-2.5 text-sm" }: { orderId: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await reorder(orderId);
          if (!res.ok) {
            toast(res.error, "error");
            return;
          }
          toast(res.message);
          router.push("/cart");
        })
      }
      className={className}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
      خرید مجدد
    </button>
  );
}

/** Time left to pay an unpaid order. At zero the page reloads, and the server cancels the order. */
export function PaymentCountdown({ seconds }: { seconds: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(Math.max(0, seconds));
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left > 0) return;
    const t = setTimeout(() => router.refresh(), 2000);
    return () => clearTimeout(t);
  }, [left, router]);

  if (left === 0) return <span className="flex items-center gap-1.5 text-xs font-bold text-brand">مهلت پرداخت تمام شد.</span>;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold text-brand" role="timer" aria-live="off">
      <Clock className="size-4" aria-hidden />
      مهلت پرداخت: <span className="tabular-nums">{faDigits(`${mm}:${ss}`)}</span>
    </span>
  );
}
