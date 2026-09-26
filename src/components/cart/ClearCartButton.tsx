"use client";

import { useTransition } from "react";
import { clearCart } from "@/app/actions/cart";

export function ClearCartButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("همه کالاها از سبد خرید حذف شوند؟")) start(() => clearCart().then(() => {}));
      }}
      className="text-[13px] font-bold text-brand hover:underline disabled:opacity-50"
    >
      پاک کردن کل سبد خرید
    </button>
  );
}
