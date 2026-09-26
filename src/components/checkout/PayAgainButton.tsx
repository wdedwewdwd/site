"use client";

import { useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { retryPayment } from "@/app/actions/checkout";
import { toast } from "@/components/ui/Toaster";

export function PayAgainButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await retryPayment(orderId);
          if (res && !res.ok) toast(res.error, "error");
        })
      }
      className="btn-primary px-5 py-2.5"
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      پرداخت مجدد
    </button>
  );
}
