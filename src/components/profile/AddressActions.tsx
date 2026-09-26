"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteAddress, setDefaultAddress } from "@/app/actions/profile";

export function AddressActions({ id, isDefault }: { id: string; isDefault: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-4 text-xs font-bold ${pending ? "opacity-50" : ""}`}>
      {!isDefault && (
        <button type="button" disabled={pending} onClick={() => start(() => setDefaultAddress(id))} className="text-muted hover:text-ink">
          انتخاب به عنوان پیش‌فرض
        </button>
      )}
      <Link href={`/profile/addresses/${id}`} className="flex items-center gap-1 text-muted hover:text-ink">
        <Pencil className="size-3.5" /> ویرایش
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm("این آدرس حذف شود؟") && start(() => deleteAddress(id))}
        className="flex items-center gap-1 text-brand hover:underline"
      >
        <Trash2 className="size-3.5" /> حذف
      </button>
    </div>
  );
}
