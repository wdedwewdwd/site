"use client";

import { Share2 } from "lucide-react";
import { toast } from "@/components/ui/Toaster";

/** Uses the native share sheet on phones; copies the link elsewhere. */
export function ShareButton({ title }: { title: string }) {
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("لینک محصول کپی شد.");
      }
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  };
  return (
    <button type="button" onClick={share} aria-label="اشتراک‌گذاری" className="grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-canvas">
      <Share2 className="size-5" aria-hidden />
    </button>
  );
}
