"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Car, Check, LoaderCircle, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { deleteCarModel, saveCarModel, type CarActionResult } from "@/app/actions/admin/cars";
import { Modal } from "@/components/ui/Modal";
import { faDigits } from "@/lib/format";

export type CarRow = { id: string; make: string; name: string; products: number };

// Forms inside the dialog live in a portal but React still bubbles their submit event to the
// product form around this component, so every handler stops it.
const stop = (e: React.FormEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

function CarFields({ make, name, onMake, onName, makes, autoFocus }: { make: string; name: string; onMake: (v: string) => void; onName: (v: string) => void; makes: string[]; autoFocus?: boolean }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs font-bold">
        سازنده
        <input value={make} onChange={(e) => onMake(e.target.value)} list="car-makes" maxLength={40} required placeholder="مثلاً: پژو" autoFocus={autoFocus} className="input py-2" />
        <datalist id="car-makes">
          {makes.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        نام خودرو
        <input value={name} onChange={(e) => onName(e.target.value)} maxLength={60} required placeholder="مثلاً: پژو ۲۰۶ تیپ ۵" className="input py-2" />
      </label>
    </>
  );
}

function CarItem({ car, makes, busy, run }: { car: CarRow; makes: string[]; busy: boolean; run: (fn: () => Promise<CarActionResult>, after?: () => void) => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [make, setMake] = useState(car.make);
  const [name, setName] = useState(car.name);

  if (mode === "edit") {
    return (
      <li className="py-3">
        <form onSubmit={(e) => { stop(e); run(() => saveCarModel({ id: car.id, make, name }), () => setMode("view")); }} className="grid items-end gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
          <CarFields make={make} name={name} onMake={setMake} onName={setName} makes={makes} autoFocus />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary px-3 py-2" aria-label="ذخیره">
              <Check className="size-4" />
            </button>
            <button type="button" onClick={() => { setMake(car.make); setName(car.name); setMode("view"); }} className="btn-ghost px-3 py-2" aria-label="انصراف">
              <X className="size-4" />
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-muted">
          <Car className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{car.name}</p>
          <p className="text-[11px] text-muted">
            {car.make} · {car.products ? `در ${faDigits(car.products)} محصول` : "هنوز روی محصولی تیک نخورده"}
          </p>
        </div>
        <button type="button" onClick={() => setMode("edit")} disabled={busy} className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label={`ویرایش ${car.name}`}>
          <Pencil className="size-4" />
        </button>
        <button type="button" onClick={() => setMode("delete")} disabled={busy} className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand" aria-label={`حذف ${car.name}`}>
          <Trash2 className="size-4" />
        </button>
      </div>
      {mode === "delete" && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft p-3 text-xs" role="alert">
          <p className="flex-1 font-bold text-brand">
            «{car.name}» از فهرست{car.products ? ` و از ${faDigits(car.products)} محصول` : ""} حذف شود؟
          </p>
          <button type="button" disabled={busy} onClick={() => run(() => deleteCarModel(car.id))} className="rounded-lg bg-brand px-3 py-1.5 font-bold text-white hover:bg-brand-dark">
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

function ManagerBody({ cars }: { cars: CarRow[] }) {
  const [busy, start] = useTransition();
  const [result, setResult] = useState<CarActionResult | null>(null);
  const [make, setMake] = useState("");
  const [name, setName] = useState("");
  const makes = [...new Set(cars.map((c) => c.make))];

  const run = (fn: () => Promise<CarActionResult>, after?: () => void) =>
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
          run(() => saveCarModel({ make, name }), () => setName(""));
        }}
        className="grid items-end gap-3 rounded-2xl border border-line bg-canvas/60 p-4 sm:grid-cols-[1fr_1.4fr_auto]"
      >
        <CarFields make={make} name={name} onMake={setMake} onName={setName} makes={makes} />
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
        <p className="mb-1 text-xs font-bold text-muted">فهرست خودروها ({faDigits(cars.length)})</p>
        {cars.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">هنوز خودرویی اضافه نشده است.</p>
        ) : (
          <ul className={`divide-y divide-line ${busy ? "opacity-60" : ""}`}>
            {cars.map((c) => (
              // Keyed by name too, so a row shows fresh values after it is renamed.
              <CarItem key={`${c.id}:${c.make}:${c.name}`} car={c} makes={makes} busy={busy} run={run} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Small "manage cars" button for the product form; the list it edits is shared by every product. */
export function CarModelManager({ cars }: { cars: CarRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost shrink-0 gap-1.5 px-3 py-1.5 text-xs">
        <Settings2 className="size-3.5" aria-hidden /> مدیریت خودروها
      </button>
      {open &&
        createPortal(
          <Modal
            open
            onClose={() => setOpen(false)}
            size="lg"
            title="مدیریت خودروها"
            description="این فهرست بین همه محصولات مشترک است: خودروی تازه برای همه محصولات قابل انتخاب می‌شود و ویرایش یا حذف، روی همه محصولات اعمال می‌شود."
          >
            <ManagerBody cars={cars} />
          </Modal>,
          document.body,
        )}
    </>
  );
}
