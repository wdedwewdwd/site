"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Pencil, X } from "lucide-react";
import { quickUpdateProduct } from "@/app/actions/admin/products";
import { faDigits, toman } from "@/lib/format";
import { toast } from "@/components/ui/Toaster";

/**
 * A price or stock number that turns into a small input on click: Enter (or ✓) saves, Esc cancels.
 * Saves straight to the product; the list refreshes with the new value.
 */
export function QuickEdit({ id, field, value, label, className = "" }: { id: string; field: "price" | "stock"; value: number; label: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const shown = field === "price" ? toman(value) : faDigits(value);

  const open = () => {
    setDraft(String(value));
    setEditing(true);
  };
  const save = () => {
    if (draft.trim() === String(value)) return setEditing(false);
    start(async () => {
      const res = await quickUpdateProduct({ id, field, value: draft });
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) setEditing(false);
    });
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        title={`ویرایش سریع ${label}`}
        aria-label={`${label}: ${shown}. برای ویرایش بزنید`}
        className={`group/qe inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-surface ${className}`}
      >
        <span>{shown}</span>
        <Pencil className="size-3 text-subtle opacity-0 transition-opacity group-hover/qe:opacity-100 max-md:opacity-100" aria-hidden />
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="inline-flex items-center gap-1"
    >
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        onFocus={(e) => e.currentTarget.select()}
        inputMode="numeric"
        dir="ltr"
        aria-label={label}
        disabled={pending}
        className={`h-8 rounded-lg border border-brand bg-white px-2 text-left text-[13px] font-bold focus:outline-none ${field === "price" ? "w-28" : "w-16"}`}
      />
      <button type="submit" disabled={pending} aria-label="ذخیره" className="grid size-8 place-items-center rounded-lg bg-ink text-white disabled:opacity-50">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
      </button>
      <button type="button" onClick={() => setEditing(false)} disabled={pending} aria-label="انصراف" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface">
        <X className="size-4" />
      </button>
    </form>
  );
}
