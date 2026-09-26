"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
import { setCartQuantity } from "@/app/actions/cart";
import { toast } from "@/components/ui/Toaster";
import { faDigits, toman } from "@/lib/format";

type Props = {
  productId: string;
  slug: string;
  name: string;
  image?: { url: string; alt: string | null };
  brand?: string | null;
  code?: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
  maxQty: number;
};

export function CartItemRow(p: Props) {
  const [pending, start] = useTransition();
  const set = (quantity: number) =>
    start(async () => {
      const res = await setCartQuantity({ productId: p.productId, quantity });
      if (!res.ok) toast(res.error, "error");
    });
  const outOfStock = p.stock < p.quantity;

  return (
    <li className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-1 items-center gap-4">
        <Link href={`/product/${p.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface">
          {p.image && <Image src={p.image.url} alt={p.image.alt ?? p.name} fill sizes="80px" className="object-cover" />}
        </Link>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link href={`/product/${p.slug}`} className="line-clamp-2 text-sm font-extrabold hover:text-brand md:text-base">
            {p.name}
          </Link>
          <p className="flex flex-wrap gap-3 text-xs text-muted">
            {p.brand && (
              <span>
                برند: <b className="text-brand" dir="ltr">{p.brand}</b>
              </span>
            )}
            {p.code && <span>کد فنی: {p.code}</span>}
          </p>
          {outOfStock ? (
            <span className="w-fit rounded-md bg-brand-soft px-2 py-1 text-[11px] font-bold text-brand">
              {p.stock === 0 ? "ناموجود شد" : `فقط ${faDigits(p.stock)} عدد موجود است`}
            </span>
          ) : (
            <span className="w-fit rounded-md bg-success-soft px-2 py-1 text-[11px] font-bold text-success">ضمانت اصالت فیزیکی</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 border-t border-line pt-3 sm:border-t-0 sm:border-r sm:pt-0 sm:pr-6">
        <div className="flex flex-col items-start gap-0.5">
          <p className="flex items-baseline gap-1">
            <span className="text-lg font-black">{toman(p.unitPrice)}</span>
            <span className="text-[10px] text-muted">تومان</span>
          </p>
          <span className="text-[11px] text-muted">قیمت واحد</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center rounded-lg border border-line bg-canvas" role="group" aria-label="تعداد">
            <button type="button" aria-label="افزایش" disabled={pending || p.quantity >= Math.min(p.stock, p.maxQty)} onClick={() => set(p.quantity + 1)} className="grid size-8 place-items-center disabled:opacity-40">
              <Plus className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-black" aria-live="polite">
              {pending ? <LoaderCircle className="mx-auto size-4 animate-spin" /> : faDigits(p.quantity)}
            </span>
            <button type="button" aria-label="کاهش" disabled={pending || p.quantity <= 1} onClick={() => set(p.quantity - 1)} className="grid size-8 place-items-center disabled:opacity-40">
              <Minus className="size-3.5" />
            </button>
          </div>
          <button type="button" onClick={() => set(0)} disabled={pending} className="flex items-center gap-1 text-xs text-muted hover:text-brand">
            <Trash2 className="size-3.5" /> حذف
          </button>
        </div>
      </div>
    </li>
  );
}
