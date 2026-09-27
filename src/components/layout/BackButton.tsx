"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { canGoBackInSite } from "./navigation";

type Props = {
  /** Where to go when there is no in-site history (or always, with `force`). */
  fallback: string;
  /** Always use `fallback` (e.g. after a payment redirect, history points at the bank). */
  force?: boolean;
  variant?: "icon" | "pill";
  /** Icon variant on a dark bar (the mobile PageBar). */
  tone?: "light" | "dark";
  className?: string;
};

export function BackButton({ fallback, force, variant = "icon", tone = "light", className = "" }: Props) {
  const router = useRouter();
  const goBack = () => {
    if (!force && canGoBackInSite()) router.back();
    else router.push(fallback);
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={goBack}
        className={`inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[13px] font-bold text-ink transition-colors hover:border-subtle hover:bg-canvas ${className}`}
      >
        بازگشت
        <ArrowLeft className="size-4" aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="بازگشت"
      className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors ${tone === "dark" ? "text-white hover:bg-white/10 active:bg-white/15" : "text-ink hover:bg-canvas active:bg-surface"} ${className}`}
    >
      <ArrowLeft className="size-6" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
