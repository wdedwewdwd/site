"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/actions/wishlist";
import { toast } from "@/components/ui/Toaster";

export function WishlistButton({ productId, initial = false, className = "" }: { productId: string; initial?: boolean; className?: string }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleWishlist(productId);
          if (!res.ok) {
            toast(res.error, "error");
            if (res.login) router.push("/login");
            return;
          }
          setSaved(res.saved);
        })
      }
      className={`grid size-8 place-items-center rounded-lg bg-white text-brand shadow-[0_2px_2px_rgba(0,0,0,0.06)] ${className}`}
    >
      <Heart className={`size-3.5 ${saved ? "fill-brand" : ""}`} />
    </button>
  );
}
