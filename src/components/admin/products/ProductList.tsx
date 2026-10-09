"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, ExternalLink, FolderInput, ImageOff, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { bulkProducts } from "@/app/actions/admin/products";
import { discountPercent, faDigits, toman } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";
import { ToggleActiveButton } from "@/components/admin/ToggleActiveButton";
import { QuickEdit } from "./QuickEdit";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  oemCode: string | null;
  brand: string | null;
  category: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isActive: boolean;
  soldCount: number;
  image: string | null;
};

type Opt = { id: string; name: string };
type Dialog = { kind: "delete" | "move"; ids: string[] } | null;

/**
 * The product table (desktop) and cards (phone) with selection, inline price/stock editing,
 * per-row actions and a bar for acting on all ticked products at once.
 * `back` is the list's query string, so the edit page can return to the same filters and page.
 */
export function ProductList({ rows, categories, back, savedId }: { rows: ProductRow[]; categories: Opt[]; back: string; savedId?: string }) {
  const [picked, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, start] = useTransition();

  // Only products still on this page count as selected (e.g. after some were deleted).
  // The page gives this component a new key for every page/filter, so those start unselected.
  const onPage = new Set(rows.map((r) => r.id));
  const selected = new Set([...picked].filter((id) => onPage.has(id)));

  // After saving a product: confirm it, scroll to its row and drop ?saved= from the address.
  useEffect(() => {
    if (!savedId) return;
    toast("محصول ذخیره شد.");
    // The row exists twice (phone card and table row); scroll to the one on screen.
    const visible = [...document.querySelectorAll<HTMLElement>("[data-saved]")].find((el) => el.offsetParent !== null);
    visible?.scrollIntoView({ block: "center" });
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    window.history.replaceState(null, "", url);
  }, [savedId]);

  const editHref = (id: string) => `/admin/products/${id}${back ? `?back=${encodeURIComponent(back)}` : ""}`;
  const allChecked = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAll = (on: boolean) => setSelected(on ? new Set(rows.map((r) => r.id)) : new Set());

  const run = (action: "activate" | "deactivate" | "move" | "delete", targetIds: string[], categoryId?: string) =>
    start(async () => {
      const res = await bulkProducts({ ids: targetIds, action, categoryId });
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setDialog(null);
        setSelected(new Set());
      }
    });

  if (rows.length === 0) return null;
  const sel = [...selected];

  return (
    <div className="relative">
      {/* Phones: one card per product */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((p) => (
          <li
            key={p.id}
            data-saved={p.id === savedId || undefined}
            className={`card flex flex-col gap-3 p-3 ${selected.has(p.id) ? "border-brand bg-brand-soft/40" : ""} ${p.id === savedId ? "ring-2 ring-success" : ""}`}
          >
            <div className="flex gap-3">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={(e) => toggle(p.id, e.target.checked)}
                aria-label={`انتخاب ${p.name}`}
                className="mt-1 size-4 shrink-0 accent-brand"
              />
              <Thumb src={p.image} size="size-16" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={editHref(p.id)} className="line-clamp-2 text-[13px] font-bold leading-6 hover:text-brand">{p.name}</Link>
                <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  <span dir="ltr">{p.sku}</span>
                  <span aria-hidden>·</span>
                  <span>{p.category}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[13px]">
              <div className="flex flex-col">
                <span className="text-[11px] text-muted">قیمت (تومان)</span>
                <PriceCell p={p} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-muted">موجودی</span>
                <StockCell p={p} />
              </div>
              <ToggleActiveButton id={p.id} active={p.isActive} />
              <RowActions p={p} editHref={editHref(p.id)} onDelete={() => setDialog({ kind: "delete", ids: [p.id] })} />
            </div>
          </li>
        ))}
      </ul>

      {/* Tablets and desktops: table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-[13px]">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = selected.size > 0 && !allChecked;
                  }}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="انتخاب همه محصولات این صفحه"
                  className="size-4 accent-brand"
                />
              </th>
              <th className="px-3 py-3 text-right font-bold">محصول</th>
              <th className="px-3 py-3 text-right font-bold">کد کالا</th>
              <th className="px-3 py-3 text-right font-bold">دسته</th>
              <th className="px-3 py-3 text-right font-bold">قیمت فروش (تومان)</th>
              <th className="px-3 py-3 text-right font-bold">موجودی</th>
              <th className="px-3 py-3 text-right font-bold">وضعیت</th>
              <th className="px-3 py-3"><span className="sr-only">عملیات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr
                key={p.id}
                data-saved={p.id === savedId || undefined}
                className={`transition-colors ${selected.has(p.id) ? "bg-brand-soft/40" : p.id === savedId ? "bg-success-soft" : "hover:bg-canvas"}`}
              >
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`انتخاب ${p.name}`} className="size-4 accent-brand" />
                </td>
                <td className="px-3 py-2.5">
                  <Link href={editHref(p.id)} className="group flex items-center gap-3">
                    <Thumb src={p.image} size="size-12" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="line-clamp-2 font-bold group-hover:text-brand">{p.name}</span>
                      {(p.brand || p.oemCode) && (
                        <span className="text-[11px] text-muted">
                          {p.brand}
                          {p.brand && p.oemCode && " · "}
                          {p.oemCode && <span dir="ltr">{p.oemCode}</span>}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-muted" dir="ltr">{p.sku}</td>
                <td className="px-3 py-3 text-muted">{p.category}</td>
                <td className="px-3 py-3"><PriceCell p={p} /></td>
                <td className="px-3 py-3"><StockCell p={p} /></td>
                <td className="px-3 py-3"><ToggleActiveButton id={p.id} active={p.isActive} /></td>
                <td className="px-3 py-3"><RowActions p={p} editHref={editHref(p.id)} onDelete={() => setDialog({ kind: "delete", ids: [p.id] })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones get their own "select all"; the table has it in the header. */}
      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[13px] font-bold md:hidden">
        <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} className="size-4 accent-brand" />
        انتخاب همه این صفحه
      </label>

      {/* Acts on the ticked products; stays at the bottom of the screen while scrolling the list. */}
      {selected.size > 0 && (
        <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-ink p-2.5 pr-4 text-[13px] text-white shadow-2xl animate-fade-up">
          <span className="font-bold">{faDigits(selected.size)} محصول انتخاب شده</span>
          <span className="mr-auto flex flex-wrap items-center gap-1.5">
            <BarButton onClick={() => run("activate", sel)} disabled={pending} icon={<Eye className="size-4" />}>فعال کردن</BarButton>
            <BarButton onClick={() => run("deactivate", sel)} disabled={pending} icon={<EyeOff className="size-4" />}>غیرفعال کردن</BarButton>
            <BarButton onClick={() => setDialog({ kind: "move", ids: sel })} disabled={pending} icon={<FolderInput className="size-4" />}>تغییر دسته</BarButton>
            <BarButton onClick={() => setDialog({ kind: "delete", ids: sel })} disabled={pending} danger icon={<Trash2 className="size-4" />}>حذف</BarButton>
            {pending && <LoaderCircle className="size-5 animate-spin" aria-label="در حال انجام" />}
            <button type="button" onClick={() => setSelected(new Set())} aria-label="لغو انتخاب" className="grid size-9 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white">
              <X className="size-4" />
            </button>
          </span>
        </div>
      )}

      {dialog?.kind === "delete" && (
        <DeleteDialog
          names={rows.filter((r) => dialog.ids.includes(r.id)).map((r) => r.name)}
          pending={pending}
          onClose={() => setDialog(null)}
          onDeactivate={() => run("deactivate", dialog.ids)}
          onDelete={() => run("delete", dialog.ids)}
        />
      )}
      {dialog?.kind === "move" && (
        <MoveDialog count={dialog.ids.length} categories={categories} pending={pending} onClose={() => setDialog(null)} onMove={(categoryId) => run("move", dialog.ids, categoryId)} />
      )}
    </div>
  );
}

function Thumb({ src, size }: { src: string | null; size: string }) {
  return (
    <span className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-xl bg-surface text-subtle`}>
      {src ? <Image src={src} alt="" fill sizes="64px" className="object-cover" /> : <ImageOff className="size-5" aria-label="بدون عکس" />}
    </span>
  );
}

function PriceCell({ p }: { p: ProductRow }) {
  const off = discountPercent(p.price, p.compareAtPrice);
  return (
    <span className="flex flex-col items-start">
      <QuickEdit id={p.id} field="price" value={p.price} label="قیمت فروش" className="font-bold" />
      {off > 0 && (
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className="rounded bg-brand-soft px-1 font-black text-brand">{faDigits(off)}٪</span>
          <s className="text-subtle">{toman(p.compareAtPrice!)}</s>
        </span>
      )}
    </span>
  );
}

function StockCell({ p }: { p: ProductRow }) {
  const tone = p.stock === 0 ? "text-brand" : p.stock <= 5 ? "text-warning" : "";
  return (
    <span className="flex flex-col items-start">
      <QuickEdit id={p.id} field="stock" value={p.stock} label="موجودی" className={`font-black ${tone}`} />
      {p.stock === 0 && <span className="text-[10px] font-bold text-brand">ناموجود</span>}
      {p.stock > 0 && p.stock <= 5 && <span className="text-[10px] font-bold text-warning">رو به اتمام</span>}
    </span>
  );
}

function RowActions({ p, editHref, onDelete }: { p: ProductRow; editHref: string; onDelete: () => void }) {
  const btn = "grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink";
  return (
    <span className="flex items-center gap-0.5">
      <Link href={editHref} className={btn} title="ویرایش" aria-label={`ویرایش ${p.name}`}>
        <Pencil className="size-4" />
      </Link>
      <a href={`/product/${p.slug}`} target="_blank" rel="noopener" className={btn} title="مشاهده در فروشگاه" aria-label={`مشاهده ${p.name} در فروشگاه`}>
        <ExternalLink className="size-4" />
      </a>
      <button type="button" onClick={onDelete} className={`${btn} hover:!bg-brand-soft hover:!text-brand`} title="حذف" aria-label={`حذف ${p.name}`}>
        <Trash2 className="size-4" />
      </button>
    </span>
  );
}

function BarButton({ children, icon, danger, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex h-9 items-center gap-1.5 rounded-xl px-3 font-bold disabled:opacity-50 ${danger ? "bg-brand hover:bg-brand-dark" : "bg-white/10 hover:bg-white/20"}`}
    >
      {icon}
      {children}
    </button>
  );
}

function DeleteDialog({ names, pending, onClose, onDeactivate, onDelete }: { names: string[]; pending: boolean; onClose: () => void; onDeactivate: () => void; onDelete: () => void }) {
  const many = names.length > 1;
  return (
    <Modal open onClose={onClose} title={many ? `حذف ${faDigits(names.length)} محصول` : "حذف محصول"}>
      <div className="flex flex-col gap-4 text-sm leading-7">
        <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl bg-canvas p-3 text-[13px] font-bold">
          {names.slice(0, 8).map((n, i) => <li key={i} className="truncate">{n}</li>)}
          {names.length > 8 && <li className="text-muted">و {faDigits(names.length - 8)} محصول دیگر</li>}
        </ul>
        <p>
          {many ? "این محصولات" : "این محصول"} با عکس‌ها و نظرهایش <b className="text-brand">برای همیشه</b> حذف می‌شود و قابل برگشت نیست. سفارش‌های قبلی دست نمی‌خورند و نام و قیمت کالا در آن‌ها می‌ماند.
        </p>
        <p className="rounded-xl bg-info-soft p-3 text-[13px] text-info">
          اگر فقط نمی‌خواهید فعلاً در فروشگاه دیده شود، به‌جای حذف آن را <b>غیرفعال</b> کنید؛ هر وقت خواستید دوباره فعالش می‌کنید.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="btn-ghost py-2.5">انصراف</button>
          <button type="button" onClick={onDeactivate} disabled={pending} className="btn-ghost py-2.5">
            <EyeOff className="size-4" /> فقط غیرفعال کن
          </button>
          <button type="button" onClick={onDelete} disabled={pending} className="btn-primary py-2.5">
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} حذف برای همیشه
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MoveDialog({ count, categories, pending, onClose, onMove }: { count: number; categories: Opt[]; pending: boolean; onClose: () => void; onMove: (categoryId: string) => void }) {
  const [categoryId, setCategoryId] = useState("");
  return (
    <Modal open onClose={onClose} title="تغییر دسته‌بندی" description={`${faDigits(count)} محصول انتخاب‌شده به دسته‌ای که انتخاب می‌کنید منتقل می‌شود.`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (categoryId) onMove(categoryId);
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col">
          <span className="label">دسته مقصد</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="input">
            <option value="">انتخاب کنید…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="btn-ghost py-2.5">انصراف</button>
          <button type="submit" disabled={pending || !categoryId} className="btn-primary py-2.5 disabled:opacity-50">
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <FolderInput className="size-4" />} انتقال
          </button>
        </div>
      </form>
    </Modal>
  );
}
