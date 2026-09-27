"use client";

import { useTransition } from "react";
import Link from "next/link";
import { setUserActive } from "@/app/actions/admin/misc";

const ROLE_LABEL = { SUPPORT: "پشتیبان", ADMIN: "مدیر" } as const;

export function UserControls({ id, active, role, self }: { id: string; active: boolean; role: "CUSTOMER" | "SUPPORT" | "ADMIN"; self: boolean }) {
  const [pending, start] = useTransition();
  if (self) return <span className="text-xs text-muted">حساب شما</span>;
  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      {role !== "CUSTOMER" && (
        <Link href="/admin/settings" className="rounded-md bg-info-soft px-2.5 py-1 text-[11px] font-bold text-info" title="مدیریت در تنظیمات">
          {ROLE_LABEL[role]}
        </Link>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setUserActive(id, !active))}
        className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${active ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}`}
      >
        {active ? "فعال" : "مسدود"}
      </button>
    </div>
  );
}
