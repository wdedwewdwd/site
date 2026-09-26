"use client";

import { useTransition } from "react";
import { setUserActive, setUserRole } from "@/app/actions/admin/misc";

export function UserControls({ id, active, role, self }: { id: string; active: boolean; role: "CUSTOMER" | "SUPPORT" | "ADMIN"; self: boolean }) {
  const [pending, start] = useTransition();
  if (self) return <span className="text-xs text-muted">حساب شما</span>;
  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      <select
        aria-label="نقش"
        defaultValue={role}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as typeof role;
          if (confirm("نقش این کاربر تغییر کند؟ کاربر از همه دستگاه‌ها خارج می‌شود.")) start(() => setUserRole(id, next));
          else e.target.value = role;
        }}
        className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
      >
        <option value="CUSTOMER">مشتری</option>
        <option value="SUPPORT">پشتیبان</option>
        <option value="ADMIN">مدیر</option>
      </select>
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
