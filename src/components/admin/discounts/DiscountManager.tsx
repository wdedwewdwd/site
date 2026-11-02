"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, LoaderCircle, Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { deleteDiscount, saveDiscount, toggleDiscount, type AdminFormState } from "@/app/actions/admin/misc";
import { keepValuesOnSubmit } from "@/components/ui/keepValuesOnSubmit";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";
import { JalaliDateField } from "@/components/admin/JalaliDateField";
import { faNum, parseJKey, type JDate } from "@/lib/jalali";

export type DiscountRow = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  /** Last valid Jalali day ("1405-09-10"), null = no end date. */
  lastDay: string | null;
  expired: boolean;
  isActive: boolean;
  createdLabel: string;
};

const money = (n: number) => faNum(n.toLocaleString("en-US")).replace(/,/g, "٬");
const discountText = (r: Pick<DiscountRow, "type" | "value" | "maxDiscount">) =>
  r.type === "PERCENT" ? `${faNum(r.value)}٪${r.maxDiscount ? ` تا سقف ${money(r.maxDiscount)} تومان` : ""}` : `${money(r.value)} تومان`;

function status(r: DiscountRow) {
  if (!r.isActive) return { label: "غیرفعال", cls: "bg-surface text-muted" };
  if (r.expired) return { label: "منقضی شده", cls: "bg-warning-soft text-warning" };
  if (r.maxUses !== null && r.usedCount >= r.maxUses) return { label: "ظرفیت تمام", cls: "bg-warning-soft text-warning" };
  return { label: "فعال", cls: "bg-success-soft text-success" };
}

/** Amount field that shows the typed number in toman underneath, so big numbers are easy to check. */
function MoneyInput({ name, defaultValue, label, hint }: { name: string; defaultValue?: string; label: string; hint?: string }) {
  const [v, setV] = useState(defaultValue ?? "");
  const n = Number(v.replace(/[^\d۰-۹]/g, "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = inputRef.current?.form;
    const onReset = () => setV(defaultValue ?? "");
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [defaultValue]);
  return (
    <label className="flex flex-col gap-1 text-xs font-bold">
      {label}
      <input ref={inputRef} name={name} value={v} onChange={(e) => setV(e.target.value)} inputMode="numeric" dir="ltr" className="input py-2 text-right" />
      <span className="min-h-4 text-[11px] font-medium text-muted">{n > 0 ? `${money(n)} تومان` : hint}</span>
    </label>
  );
}

/** The fields shared by «new code» and «edit code». */
function DiscountFields({ row, today }: { row?: DiscountRow; today: JDate }) {
  const [type, setType] = useState<"PERCENT" | "FIXED">(row?.type ?? "PERCENT");
  const typeRef = useRef<HTMLSelectElement>(null);
  // After «ساخت کد» the form is reset: the type (and with it the fields shown) goes back too.
  useEffect(() => {
    const form = typeRef.current?.form;
    const onReset = () => setType(row?.type ?? "PERCENT");
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [row?.type]);
  return (
    <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-xs font-bold">
        کد
        <input name="code" dir="ltr" required defaultValue={row?.code} maxLength={20} placeholder="AUTUMN15" autoComplete="off" className="input py-2 text-right font-black uppercase tracking-wide" />
        <span className="min-h-4 text-[11px] font-medium text-muted">
          {row && row.usedCount > 0 ? "تغییر نام روی سفارش‌های قبلی اثری ندارد" : "۴ تا ۲۰ حرف انگلیسی یا عدد"}
        </span>
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        نوع تخفیف
        <select ref={typeRef} name="type" value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")} className="input py-2">
          <option value="PERCENT">درصدی</option>
          <option value="FIXED">مبلغ ثابت (تومان)</option>
        </select>
        <span className="min-h-4" />
      </label>
      {type === "PERCENT" ? (
        <>
          <label className="flex flex-col gap-1 text-xs font-bold">
            درصد تخفیف
            <input name="value" required inputMode="numeric" dir="ltr" defaultValue={row?.type === "PERCENT" ? String(row.value) : ""} placeholder="15" className="input py-2 text-right" />
            <span className="min-h-4 text-[11px] font-medium text-muted">بین ۱ تا ۹۰</span>
          </label>
          <MoneyInput name="maxDiscount" label="سقف تخفیف (تومان)" defaultValue={row?.maxDiscount ? String(row.maxDiscount) : ""} hint="خالی = بدون سقف" />
        </>
      ) : (
        <>
          <MoneyInput name="value" label="مبلغ تخفیف (تومان)" defaultValue={row?.type === "FIXED" ? String(row.value) : ""} />
          <input type="hidden" name="maxDiscount" value="" />
          <span className="hidden lg:block" />
        </>
      )}
      <MoneyInput name="minOrder" label="حداقل مبلغ سفارش" defaultValue={row?.minOrder ? String(row.minOrder) : ""} hint="خالی = بدون حداقل" />
      <label className="flex flex-col gap-1 text-xs font-bold">
        حداکثر دفعات استفاده
        <input name="maxUses" inputMode="numeric" dir="ltr" defaultValue={row?.maxUses != null ? String(row.maxUses) : ""} className="input py-2 text-right" />
        <span className="min-h-4 text-[11px] font-medium text-muted">
          {row && row.usedCount > 0 ? `تا الان ${faNum(row.usedCount)} بار استفاده شده` : "خالی = بدون محدودیت"}
        </span>
      </label>
      <div className="flex flex-col gap-1 text-xs font-bold sm:col-span-2">
        تاریخ انقضا
        <JalaliDateField name="validTo" defaultValue={row?.lastDay ? parseJKey(row.lastDay) : null} today={today} />
      </div>
    </div>
  );
}

function CreateDiscount({ today }: { today: JDate }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(saveDiscount, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      toast(state.message ?? "کد تخفیف ساخته شد.");
    }
  }, [state]);
  return (
    <section className="card mb-6 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-black">
        <Plus className="size-5 text-brand" aria-hidden /> کد تخفیف جدید
      </h2>
      <form ref={ref} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-4">
        <DiscountFields today={today} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary py-2.5">
            {pending && <LoaderCircle className="size-4 animate-spin" />} ساخت کد
          </button>
          {state && !state.ok && <p className="text-xs font-bold text-brand" role="alert">{state.error}</p>}
        </div>
      </form>
    </section>
  );
}

function Switch({ row }: { row: DiscountRow }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        role="switch"
        checked={row.isActive}
        disabled={pending}
        onChange={() => start(async () => {
          await toggleDiscount(row.id);
          toast(row.isActive ? `کد ${row.code} غیرفعال شد.` : `کد ${row.code} فعال شد.`);
        })}
        className="peer sr-only"
        aria-label={`فعال بودن کد ${row.code}`}
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors after:absolute after:right-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-success peer-checked:after:-translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
    </label>
  );
}

function EditDiscount({ row, today, onDone }: { row: DiscountRow; today: JDate; onDone: () => void }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(saveDiscount, null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [active, setActive] = useState(row.isActive);

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "ذخیره شد.");
      onDone();
    }
  }, [state, onDone]);

  const remove = () =>
    startDelete(async () => {
      const r = await deleteDiscount(row.id);
      if (r?.ok) {
        toast(r.message ?? "حذف شد.");
        onDone();
      } else setDeleteError(r?.error ?? "حذف نشد؛ دوباره تلاش کنید.");
    });

  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={row.id} />
      <DiscountFields row={row} today={today} />

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-canvas px-4 py-3">
        <span className="flex flex-col">
          <span className="text-sm font-extrabold">{active ? "کد فعال است" : "کد غیرفعال است"}</span>
          <span className="text-xs text-muted">{active ? "مشتری‌ها می‌توانند آن را در سبد خرید وارد کنند." : "تا وقتی روشنش نکنید، در سبد خرید پذیرفته نمی‌شود."}</span>
        </span>
        <input type="checkbox" role="switch" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="peer sr-only" />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors after:absolute after:right-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-success peer-checked:after:-translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
      </label>

      {state && !state.ok && <p className="rounded-xl bg-brand-soft px-4 py-3 text-xs font-bold text-brand" role="alert">{state.error}</p>}

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-4" role="alertdialog" aria-label="تأیید حذف">
          <p className="text-sm font-extrabold text-brand">کد {row.code} برای همیشه حذف شود؟</p>
          <p className="text-xs leading-6 text-ink">
            سفارش‌هایی که قبلاً با این کد ثبت شده‌اند تغییری نمی‌کنند.
            {row.usedCount > 0 && ` این کد ${faNum(row.usedCount)} بار استفاده شده است.`} اگر فقط می‌خواهید فعلاً استفاده نشود، به‌جای حذف آن را غیرفعال کنید.
          </p>
          {deleteError && <p className="text-xs font-bold text-brand" role="alert">{deleteError}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={remove} disabled={deleting} className="btn bg-brand px-4 py-2.5 text-white hover:bg-brand-dark">
              {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} بله، حذف شود
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className="btn-ghost px-4 py-2.5">انصراف</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5">
              {pending && <LoaderCircle className="size-4 animate-spin" />} ذخیره تغییرات
            </button>
            <button type="button" onClick={onDone} className="btn-ghost px-4 py-2.5">انصراف</button>
          </div>
          <button type="button" onClick={() => setConfirming(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-brand hover:bg-brand-soft">
            <Trash2 className="size-4" /> حذف کد
          </button>
        </div>
      )}
    </form>
  );
}

export function DiscountManager({ rows, today }: { rows: DiscountRow[]; today: string }) {
  const todayJ = parseJKey(today)!;
  const [editing, setEditing] = useState<string | null>(null);
  const current = rows.find((r) => r.id === editing) ?? null;
  const close = useCallback(() => setEditing(null), []);

  return (
    <>
      <CreateDiscount today={todayJ} />

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <h2 className="whitespace-nowrap text-base font-black">کدهای ساخته‌شده</h2>
          {rows.length > 0 && <span className="text-xs text-muted">برای ویرایش یا حذف، روی هر کد بزنید</span>}
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <TicketPercent className="size-10 text-subtle" aria-hidden />
            <p className="text-sm font-bold">هنوز کد تخفیفی نساخته‌اید</p>
            <p className="text-xs text-muted">اولین کد را با فرم بالا بسازید.</p>
          </div>
        ) : (
          <>
            {/* Desktop: a table whose rows open the edit window */}
            <table className="hidden w-full text-[13px] md:table">
              <thead className="bg-canvas text-muted">
                <tr>
                  <th className="px-5 py-3 text-right font-bold">کد</th>
                  <th className="px-4 py-3 text-right font-bold">تخفیف</th>
                  <th className="px-4 py-3 text-right font-bold">حداقل سفارش</th>
                  <th className="px-4 py-3 text-right font-bold">استفاده</th>
                  <th className="px-4 py-3 text-right font-bold">انقضا</th>
                  <th className="px-4 py-3 text-right font-bold">وضعیت</th>
                  <th className="px-4 py-3" aria-label="ویرایش" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const s = status(r);
                  return (
                    <tr key={r.id} onClick={() => setEditing(r.id)} className="group cursor-pointer transition-colors hover:bg-canvas">
                      <td className="px-5 py-3.5">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(r.id); }} className="font-black tracking-wide hover:text-brand" dir="ltr">
                          {r.code}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">{discountText(r)}</td>
                      <td className="px-4 py-3.5">{r.minOrder ? `${money(r.minOrder)} تومان` : <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3.5">{faNum(r.usedCount)}{r.maxUses !== null && <span className="text-muted"> از {faNum(r.maxUses)}</span>}</td>
                      <td className={`px-4 py-3.5 ${r.expired ? "text-warning" : "text-muted"}`}>{r.lastDay ? faNum(r.lastDay.replace(/-/g, "/")) : "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-2.5">
                          <Switch row={r} />
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>{s.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-left">
                        <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-muted group-hover:text-ink">
                          <Pencil className="size-3.5" aria-hidden /> ویرایش
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Phones: one card per code */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((r) => {
                const s = status(r);
                return (
                  <li key={r.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditing(r.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setEditing(r.id))}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-canvas"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-black tracking-wide" dir="ltr">{r.code}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>{s.label}</span>
                        </span>
                        <span className="text-[13px] font-bold">{discountText(r)}</span>
                        <span className="text-[11px] text-muted">
                          {faNum(r.usedCount)}{r.maxUses !== null ? ` از ${faNum(r.maxUses)}` : ""} بار استفاده
                          {r.minOrder ? ` • سفارش بالای ${money(r.minOrder)}` : ""}
                          {r.lastDay ? ` • تا ${faNum(r.lastDay.replace(/-/g, "/"))}` : ""}
                        </span>
                      </span>
                      <Switch row={r} />
                      <ChevronLeft className="size-4 shrink-0 text-subtle" aria-hidden />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <Modal open={!!current} onClose={close} title={current ? `ویرایش کد ${current.code}` : ""} description={current ? `ساخته‌شده در ${current.createdLabel}، تا الان ${faNum(current.usedCount)} بار استفاده شده` : undefined} size="lg">
        {current && <EditDiscount key={current.id} row={current} today={todayJ} onDone={close} />}
      </Modal>
    </>
  );
}
