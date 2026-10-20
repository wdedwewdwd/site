"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";
import { addToCart } from "@/app/actions/cart";
import { toast } from "@/components/ui/Toaster";

type Props = {
  productId: string;
  disabled?: boolean;
  variant?: "icon" | "pill" | "full";
  buyNow?: boolean;
  label?: string;
  className?: string;
};

export function AddToCartButton({ productId, disabled, variant = "icon", buyNow, label, className = "" }: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const onClick = () =>
    start(async () => {
      const res = await addToCart({ productId });
      if (!res.ok) return toast(res.error, "error");
      if (buyNow) router.push("/cart");
      else toast(res.message ?? "اضافه شد");
    });

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        aria-label="افزودن به سبد خرید"
        className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-dark disabled:bg-subtle"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
      </button>
    );
  }
  if (variant === "pill") {
    const soldOut = disabled && !pending;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold ${soldOut ? "bg-surface text-muted" : "bg-brand-soft text-brand active:bg-brand active:text-white"}`}
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : !soldOut && <Plus className="size-4" />}
        {soldOut ? "ناموجود" : "افزودن"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={`${buyNow ? "btn-outline min-w-32" : "btn-primary min-w-40"} ${className}`}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {label ?? (buyNow ? "خرید فوری" : "افزودن به سبد خرید")}
    </button>
  );
}
