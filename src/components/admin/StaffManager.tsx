"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { LoaderCircle, Pencil, Plus, ShieldCheck, UserMinus, X } from "lucide-react";
import { addStaff, removeStaff, updateStaff, type StaffFormState } from "@/app/actions/admin/staff";

export type StaffRow = {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "SUPPORT" | "CUSTOMER";
  hasCode: boolean;
  isActive: boolean;
  lastLogin: string | null;
  self: boolean;
};

const ROLE_LABEL = { ADMIN: "مدیر کل", SUPPORT: "پشتیبان", CUSTOMER: "بدون دسترسی" } as const;

const codeInput = "input py-2 tracking-[0.3em]";

function CodeField({ name, label, required, autoComplete = "new-password" }: { name: string; label: string; required?: boolean; autoComplete?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold">
      {label}
      <input name={name} type="password" inputMode="numeric" pattern="[0-9۰-۹]*" maxLength={6} autoComplete={autoComplete} required={required} dir="ltr" className={codeInput} />
    </label>
  );
}

function NameFields({ first, last }: { first?: string; last?: string }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs font-bold">
        نام
        <input name="firstName" defaultValue={first} required maxLength={50} autoComplete="off" className="input py-2" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        <span>
          نام خانوادگی <span className="font-normal text-muted">(اختیاری)</span>
        </span>
        <input name="lastName" defaultValue={last} maxLength={50} autoComplete="off" className="input py-2" />
      </label>
    </>
  );
}

function RoleField({ value = "ADMIN" }: { value?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold">
      سطح دسترسی
      <select name="role" defaultValue={value === "SUPPORT" ? "SUPPORT" : "ADMIN"} className="input py-2">
        <option value="ADMIN">مدیر کل (همه بخش‌ها)</option>
        <option value="SUPPORT">پشتیبان (سفارش‌ها، گفتگو و تیکت‌ها)</option>
      </select>
    </label>
  );
}

function Result({ state }: { state: StaffFormState }) {
  if (!state) return null;
  return (
    <p className={`text-xs font-bold ${state.ok ? "text-success" : "text-brand"}`} role={state.ok ? "status" : "alert"}>
      {state.message}
    </p>
  );
}

function SubmitRow({ pending, label, onCancel, state }: { pending: boolean; label: string; onCancel: () => void; state: StaffFormState }) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
      <button type="submit" disabled={pending} className="btn-primary py-2.5">
        {pending && <LoaderCircle className="size-4 animate-spin" />} {label}
      </button>
      <button type="button" onClick={onCancel} className="btn-ghost py-2.5">
        انصراف
      </button>
      <Result state={state} />
    </div>
  );
}

/** Like useActionState, but submits via onSubmit so a failed attempt doesn't clear what was typed. */
function useStaffAction(fn: (state: StaffFormState, formData: FormData) => Promise<StaffFormState>) {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(fn, null);
  const [, start] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    start(() => action(formData));
  };
  return [state, onSubmit, pending] as const;
}

function AddStaffForm({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const [state, onSubmit, pending] = useStaffAction(addStaff);
  useEffect(() => {
    if (state?.ok) onDone(state.message);
  }, [state, onDone]);

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-line bg-canvas/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="flex flex-col gap-1 text-xs font-bold">
        شماره موبایل
        <input name="phone" type="tel" inputMode="tel" required maxLength={20} placeholder="09xxxxxxxxx" autoComplete="off" dir="ltr" className="input py-2" />
      </label>
      <NameFields />
      <RoleField />
      <CodeField name="code" label="کد ورود ثابت (۶ رقم)" required />
      <CodeField name="confirm" label="تکرار کد ورود" required />
      <div className="sm:col-span-2 lg:col-span-3">
        <div className="max-w-xs">
          <CodeField name="myCode" label="کد ورود خودتان (برای تأیید)" required autoComplete="current-password" />
        </div>
      </div>
      <SubmitRow pending={pending} label="افزودن" onCancel={onClose} state={state} />
    </form>
  );
}

function EditStaffForm({ row, onClose, onDone }: { row: StaffRow; onClose: () => void; onDone: (message: string) => void }) {
  const [state, onSubmit, pending] = useStaffAction(updateStaff);
  useEffect(() => {
    if (state?.ok) onDone(state.message);
  }, [state, onDone]);

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-4 rounded-xl border border-line bg-canvas/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="id" value={row.id} />
      <NameFields first={row.firstName} last={row.lastName} />
      <RoleField value={row.role} />
      <CodeField name="code" label={row.hasCode ? "کد ورود جدید (خالی = بدون تغییر)" : "کد ورود ثابت (۶ رقم)"} required={!row.hasCode} />
      <CodeField name="confirm" label="تکرار کد ورود جدید" required={!row.hasCode} />
      <CodeField name="myCode" label="کد ورود خودتان (برای تأیید)" required autoComplete="current-password" />
      <SubmitRow pending={pending} label="ذخیره" onCancel={onClose} state={state} />
    </form>
  );
}

function StaffItem({ row, editing, onEdit, onClose, onDone }: { row: StaffRow; editing: boolean; onEdit: () => void; onClose: () => void; onDone: (message: string) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || "بدون نام";

  const remove = () => {
    if (!confirm(`دسترسی «${name}» به پنل مدیریت حذف شود؟ حسابش به یک مشتری عادی تبدیل می‌شود.`)) return;
    start(async () => {
      const res = await removeStaff(row.id);
      if (res?.ok) onDone(res.message);
      else setError(res?.message ?? null);
    });
  };

  return (
    <li className={`py-4 ${pending ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {name} {row.self && <span className="text-xs font-normal text-muted">(شما)</span>}
            </p>
            <p className="text-xs text-muted" dir="ltr">
              {row.phone}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className={`rounded-md px-2 py-1 ${row.role === "ADMIN" ? "bg-brand-soft text-brand" : "bg-surface text-ink"}`}>{ROLE_LABEL[row.role]}</span>
          {!row.hasCode && <span className="rounded-md bg-warning-soft px-2 py-1 text-warning">کد ورود ندارد</span>}
          {!row.isActive && <span className="rounded-md bg-brand-soft px-2 py-1 text-brand">مسدود</span>}
          <span className="font-normal text-muted">{row.lastLogin ? `آخرین ورود: ${row.lastLogin}` : "هنوز وارد نشده"}</span>
        </div>
        {row.self ? (
          <span className="text-xs text-muted">کد خودتان را در بخش «کد ورود ثابت من» تغییر دهید</span>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={editing ? onClose : onEdit} className="btn-ghost px-3 py-1.5 text-xs">
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />} {editing ? "بستن" : "ویرایش"}
            </button>
            <button type="button" onClick={remove} disabled={pending} className="btn-ghost px-3 py-1.5 text-xs text-brand">
              <UserMinus className="size-3.5" /> حذف دسترسی
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs font-bold text-brand" role="alert">
          {error}
        </p>
      )}
      {editing && <EditStaffForm row={row} onClose={onClose} onDone={onDone} />}
    </li>
  );
}

export function StaffManager({ staff }: { staff: StaffRow[] }) {
  // "new" = add form open; a user id = that row's edit form open.
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const done = useCallback((message: string) => {
    setOpen(null);
    setNotice(message);
  }, []);

  return (
    <div>
      {notice && (
        <p className="mb-2 rounded-lg bg-success-soft p-3 text-xs font-bold text-success" role="status">
          {notice}
        </p>
      )}
      <ul className="divide-y divide-line">
        {staff.map((row) => (
          <StaffItem key={row.id} row={row} editing={open === row.id} onEdit={() => { setNotice(null); setOpen(row.id); }} onClose={close} onDone={done} />
        ))}
      </ul>
      <div className="mt-2 border-t border-line pt-4">
        {open === "new" ? (
          <AddStaffForm onClose={close} onDone={done} />
        ) : (
          <button type="button" onClick={() => { setNotice(null); setOpen("new"); }} className="btn-outline py-2.5">
            <Plus className="size-4" /> افزودن مدیر یا پشتیبان
          </button>
        )}
      </div>
    </div>
  );
}
