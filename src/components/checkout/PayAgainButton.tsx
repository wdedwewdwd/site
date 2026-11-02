"use client";

import { useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { retryPayment } from "@/app/actions/checkout";
import { toast } from "@/components/ui/Toaster";

export function PayAgainButton({ orderId, className = "btn-primary px-5 py-2.5" }: { orderId: string; className?: string }) {
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
      className={className}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      پرداخت مجدد
    </button>
  );
}
