"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, LoaderCircle, Pencil, Plus, Settings2, Tag, Trash2, X } from "lucide-react";
import { deleteBrand, saveBrand, type BrandActionResult } from "@/app/actions/admin/brands";
import { Modal } from "@/components/ui/Modal";
import { faDigits } from "@/lib/format";

export type BrandRow = { id: string; name: string; latin: string | null; products: number };

// Forms inside the dialog live in a portal but React still bubbles their submit event to the
// product form around this component, so every handler stops it.
const stop = (e: React.FormEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

/** How the brand appears in the shop's brand filter. */
const filterLabel = (name: string, latin: string) => (latin.trim() ? `${name.trim()} (${latin.trim()})` : name.trim());

function BrandFields({ name, latin, onName, onLatin, autoFocus }: { name: string; latin: string; onName: (v: string) => void; onLatin: (v: string) => void; autoFocus?: boolean }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs font-bold">
        نام برند (فارسی)
        <input value={name} onChange={(e) => onName(e.target.value)} maxLength={60} required placeholder="مثلاً: بوش" autoFocus={autoFocus} className="input py-2" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        نام لاتین (اختیاری)
        <input value={latin} onChange={(e) => onLatin(e.target.value)} maxLength={60} dir="ltr" placeholder="BOSCH" className="input py-2 text-left" />
      </label>
    </>
  );
}

function BrandItem({ brand, busy, run }: { brand: BrandRow; busy: boolean; run: (fn: () => Promise<BrandActionResult>, after?: () => void) => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [name, setName] = useState(brand.name);
  const [latin, setLatin] = useState(brand.latin ?? "");

  if (mode === "edit") {
    return (
      <li className="py-3">
        <form onSubmit={(e) => { stop(e); run(() => saveBrand({ id: brand.id, name, latin }), () => setMode("view")); }} className="grid items-end gap-3 sm:grid-cols-[1.3fr_1fr_auto]">
          <BrandFields name={name} latin={latin} onName={setName} onLatin={setLatin} autoFocus />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary px-3 py-2" aria-label="ذخیره">
              <Check className="size-4" />
            </button>
            <button type="button" onClick={() => { setName(brand.name); setLatin(brand.latin ?? ""); setMode("view"); }} className="btn-ghost px-3 py-2" aria-label="انصراف">
              <X className="size-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted sm:col-span-3">در فیلتر فروشگاه: <b className="text-ink">{filterLabel(name, latin) || "—"}</b></p>
        </form>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-muted">
          <Tag className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {brand.name}
            {brand.latin && <bdi className="mr-1.5 font-medium text-muted" dir="ltr">{brand.latin}</bdi>}
          </p>
          <p className="text-[11px] text-muted">{brand.products ? `روی ${faDigits(brand.products)} محصول` : "هنوز روی محصولی انتخاب نشده"}</p>
        </div>
        <button type="button" onClick={() => setMode("edit")} disabled={busy} className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label={`ویرایش ${brand.name}`}>
          <Pencil className="size-4" />
        </button>
        <button type="button" onClick={() => setMode("delete")} disabled={busy} className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand" aria-label={`حذف ${brand.name}`}>
          <Trash2 className="size-4" />
        </button>
      </div>
      {mode === "delete" && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft p-3 text-xs" role="alert">
          <p className="flex-1 font-bold text-brand">
            «{brand.name}» از فهرست حذف شود؟{brand.products ? ` ${faDigits(brand.products)} محصول آن سر جایشان می‌مانند و فقط بدون برند می‌شوند.` : ""}
          </p>
          <button type="button" disabled={busy} onClick={() => run(() => deleteBrand(brand.id))} className="rounded-lg bg-brand px-3 py-1.5 font-bold text-white hover:bg-brand-dark">
            بله، حذف شود
          </button>
          <button type="button" onClick={() => setMode("view")} className="rounded-lg bg-white px-3 py-1.5 font-bold text-ink">
            انصراف
          </button>
        </div>
      )}
    </li>
  );
}

function ManagerBody({ brands }: { brands: BrandRow[] }) {
  const [busy, start] = useTransition();
  const [result, setResult] = useState<BrandActionResult | null>(null);
  const [name, setName] = useState("");
  const [latin, setLatin] = useState("");

  const run = (fn: () => Promise<BrandActionResult>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) after?.();
    });

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(e) => {
          stop(e);
          run(() => saveBrand({ name, latin }), () => {
            setName("");
            setLatin("");
          });
        }}
        className="grid items-end gap-3 rounded-2xl border border-line bg-canvas/60 p-4 sm:grid-cols-[1.3fr_1fr_auto]"
      >
        <BrandFields name={name} latin={latin} onName={setName} onLatin={setLatin} />
        <button type="submit" disabled={busy} className="btn-primary py-2">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} افزودن
        </button>
      </form>

      {result && (
        <p className={`rounded-lg p-3 text-xs font-bold ${result.ok ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}`} role={result.ok ? "status" : "alert"}>
          {result.message}
        </p>
      )}

      <div>
        <p className="mb-1 text-xs font-bold text-muted">فهرست برندها ({faDigits(brands.length)})</p>
        {brands.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">هنوز برندی اضافه نشده است.</p>
        ) : (
          <ul className={`divide-y divide-line ${busy ? "opacity-60" : ""}`}>
            {brands.map((b) => (
              // Keyed by name too, so a row shows fresh values after it is renamed.
              <BrandItem key={`${b.id}:${b.name}:${b.latin ?? ""}`} brand={b} busy={busy} run={run} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Small "manage brands" button for the product form; the list it edits is shared by every product and the shop filter. */
export function BrandManager({ brands }: { brands: BrandRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost shrink-0 gap-1.5 px-3 py-1.5 text-xs">
        <Settings2 className="size-3.5" aria-hidden /> مدیریت برندها
      </button>
      {open &&
        createPortal(
          <Modal
            open
            onClose={() => setOpen(false)}
            size="lg"
            title="مدیریت برندها"
            description="این فهرست بین همه محصولات و «فیلتر برندها»ی فروشگاه مشترک است: نام تازه همه‌جا نمایش داده می‌شود و برند حذف‌شده از روی محصولاتش برداشته می‌شود."
          >
            <ManagerBody brands={brands} />
          </Modal>,
          document.body,
        )}
    </>
  );
}
