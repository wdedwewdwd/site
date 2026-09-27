"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CornerDownLeft, ExternalLink, FolderPlus, FolderTree, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCategory, moveCategory, saveCategory, toggleCategory, type CategoryActionState } from "@/app/actions/admin/categories";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { faDigits } from "@/lib/format";
import { CATEGORY_ICON_LABELS, CATEGORY_ICON_NAMES } from "@/lib/shop";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  parentId: string | null;
  productCount: number;
  childCount: number;
};

type Editing = { mode: "create"; parentId: string | null } | { mode: "edit"; category: CategoryRow };

/** Runs `onSuccess` once each time a server action reports success. */
function useOnSuccess(state: CategoryActionState, onSuccess: () => void) {
  const cb = useRef(onSuccess);
  useEffect(() => {
    cb.current = onSuccess;
  });
  useEffect(() => {
    if (state?.ok) {
      toast(state.message);
      cb.current();
    }
  }, [state]);
}

export function CategoryManager({ categories, help }: { categories: CategoryRow[]; help?: React.ReactNode }) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);
  const [formKey, setFormKey] = useState(0);

  const mains = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const openForm = (e: Editing) => {
    setFormKey((k) => k + 1);
    setEditing(e);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-black md:text-2xl">دسته‌بندی‌ها</h1>
        <button type="button" onClick={() => openForm({ mode: "create", parentId: null })} className="btn-primary py-2.5">
          <Plus className="size-4" /> افزودن دسته‌بندی
        </button>
      </div>

      {help}
      <Stats categories={categories} />

      <section className="card overflow-hidden" aria-label="فهرست دسته‌بندی‌ها">
        <div className="hidden grid-cols-[72px_1fr_110px_120px_150px] items-center gap-4 border-b border-line bg-canvas px-5 py-3 text-xs font-bold text-muted md:grid">
          <span>ترتیب</span>
          <span>دسته‌بندی</span>
          <span>محصولات</span>
          <span>نمایش در سایت</span>
          <span className="text-left">عملیات</span>
        </div>

        {mains.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <FolderTree className="size-12 text-subtle" />
            <p className="font-extrabold">هنوز دسته‌بندی‌ای ندارید</p>
            <p className="text-sm text-muted">اولین دسته‌بندی را بسازید تا بتوانید محصولات را به آن اضافه کنید.</p>
            <button type="button" onClick={() => openForm({ mode: "create", parentId: null })} className="btn-primary mt-2">
              <Plus className="size-4" /> افزودن دسته‌بندی
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {mains.map((c, i) => {
              const kids = childrenOf(c.id);
              return (
                <li key={c.id}>
                  <Row
                    category={c}
                    isFirst={i === 0}
                    isLast={i === mains.length - 1}
                    onEdit={() => openForm({ mode: "edit", category: c })}
                    onDelete={() => setDeleting(c)}
                    onAddChild={() => openForm({ mode: "create", parentId: c.id })}
                  />
                  {kids.length > 0 && (
                    <ul className="divide-y divide-line border-t border-line bg-canvas/60">
                      {kids.map((k, j) => (
                        <li key={k.id}>
                          <Row
                            category={k}
                            isChild
                            isFirst={j === 0}
                            isLast={j === kids.length - 1}
                            onEdit={() => openForm({ mode: "edit", category: k })}
                            onDelete={() => setDeleting(k)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing?.mode === "edit" ? `ویرایش «${editing.category.name}»` : editing?.parentId ? "افزودن زیردسته" : "افزودن دسته‌بندی"}
        description="نام را به فارسی بنویسید؛ آدرس صفحه دسته خودکار ساخته می‌شود."
      >
        {editing && <CategoryForm key={formKey} editing={editing} mains={mains} onDone={() => setEditing(null)} />}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={deleting ? `حذف دسته «${deleting.name}»` : ""}>
        {deleting && <DeleteForm key={deleting.id} category={deleting} all={categories} onDone={() => setDeleting(null)} />}
      </Modal>
    </>
  );
}

function Stats({ categories }: { categories: CategoryRow[] }) {
  const items = [
    { label: "دسته‌های اصلی", value: categories.filter((c) => !c.parentId).length },
    { label: "زیردسته‌ها", value: categories.filter((c) => c.parentId).length },
    { label: "پنهان از سایت", value: categories.filter((c) => !c.isActive).length },
    { label: "محصولات دسته‌بندی‌شده", value: categories.reduce((s, c) => s + c.productCount, 0) },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="card flex flex-col gap-1 px-5 py-4">
          <span className="text-xs text-muted">{s.label}</span>
          <span className="text-xl font-black">{faDigits(s.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Row(props: {
  category: CategoryRow;
  isChild?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild?: () => void;
}) {
  const { category: c, isChild } = props;
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<CategoryActionState>) =>
    start(async () => {
      const res = await fn();
      if (res && !res.ok) toast(res.message, "error");
      else if (res?.message) toast(res.message);
    });

  return (
    <div
      className={`grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 px-5 py-4 md:grid-cols-[72px_1fr_110px_120px_150px] ${pending ? "opacity-60" : ""}`}
    >
      {/* Order */}
      <div className="flex items-center gap-1" aria-label="تغییر ترتیب">
        <button type="button" title="انتقال به بالا" aria-label={`انتقال ${c.name} به بالا`} disabled={props.isFirst || pending} onClick={() => run(() => moveCategory(c.id, "up"))} className="grid size-8 place-items-center rounded-lg border border-line bg-white text-muted hover:text-ink disabled:opacity-30">
          <ArrowUp className="size-4" />
        </button>
        <button type="button" title="انتقال به پایین" aria-label={`انتقال ${c.name} به پایین`} disabled={props.isLast || pending} onClick={() => run(() => moveCategory(c.id, "down"))} className="grid size-8 place-items-center rounded-lg border border-line bg-white text-muted hover:text-ink disabled:opacity-30">
          <ArrowDown className="size-4" />
        </button>
      </div>

      {/* Name */}
      <div className={`flex min-w-0 items-center gap-3 ${isChild ? "md:pr-8" : ""}`}>
        {isChild && <CornerDownLeft className="hidden size-4 shrink-0 text-subtle md:block" aria-hidden />}
        <span className={`grid shrink-0 place-items-center rounded-xl ${isChild ? "size-9 bg-white text-muted" : "size-11 bg-brand-soft text-brand"}`}>
          <CategoryIcon name={c.icon} className={isChild ? "size-4" : "size-5"} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2 truncate text-sm font-extrabold">
            {c.name}
            {!isChild && c.childCount > 0 && <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted">{faDigits(c.childCount)} زیردسته</span>}
          </span>
          <span className="truncate text-[11px] text-subtle" dir="ltr">/category/{c.slug}</span>
        </span>
      </div>

      {/* Products */}
      <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:block">
        <span className="text-xs text-muted md:hidden">محصولات</span>
        <Link href={`/admin/products?category=${c.id}`} className="text-sm font-bold hover:text-brand" title="مشاهده محصولات این دسته">
          {faDigits(c.productCount)} <span className="text-xs font-normal text-muted">محصول</span>
        </Link>
      </div>

      {/* Visibility */}
      <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:justify-start">
        <span className="text-xs text-muted md:hidden">نمایش در سایت</span>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" role="switch" checked={c.isActive} disabled={pending} onChange={() => run(() => toggleCategory(c.id))} className="peer sr-only" aria-label={`نمایش ${c.name} در سایت`} />
          <span className="relative h-6 w-11 rounded-full bg-line transition-colors after:absolute after:top-0.5 after:right-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-success peer-checked:after:-translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
          <span className={`text-xs font-bold ${c.isActive ? "text-success" : "text-muted"}`}>{c.isActive ? "فعال" : "پنهان"}</span>
        </label>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center justify-end gap-1 border-t border-line pt-3 md:col-span-1 md:border-0 md:pt-0">
        {props.onAddChild && (
          <IconButton label="افزودن زیردسته" onClick={props.onAddChild}>
            <FolderPlus className="size-4" />
          </IconButton>
        )}
        <IconButton label="ویرایش" onClick={props.onEdit}>
          <Pencil className="size-4" />
        </IconButton>
        <Link href={`/category/${c.slug}`} target="_blank" title="مشاهده در فروشگاه" aria-label={`مشاهده ${c.name} در فروشگاه`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-info">
          <ExternalLink className="size-4" />
        </Link>
        <IconButton label="حذف" onClick={props.onDelete} danger>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas ${danger ? "hover:bg-brand-soft hover:text-brand" : "hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function CategoryForm({ editing, mains, onDone }: { editing: Editing; mains: CategoryRow[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(saveCategory, null);
  const c = editing.mode === "edit" ? editing.category : null;
  const defaultParent = c ? c.parentId ?? "" : editing.mode === "create" ? editing.parentId ?? "" : "";
  const hasChildren = !!c && c.childCount > 0;

  useOnSuccess(state, onDone);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={c?.id ?? ""} />

      <div>
        <label htmlFor="cat-name" className="label">نام دسته‌بندی *</label>
        <input id="cat-name" name="name" defaultValue={c?.name} placeholder="مثلاً: لوازم ترمز" required maxLength={60} className="input" />
      </div>

      <div>
        <label htmlFor="cat-parent" className="label">جایگاه</label>
        <select id="cat-parent" name="parentId" defaultValue={defaultParent} disabled={hasChildren} className="input disabled:opacity-60">
          <option value="">دسته اصلی (در صفحه اول سایت نمایش داده می‌شود)</option>
          {mains
            .filter((m) => m.id !== c?.id)
            .map((m) => (
              <option key={m.id} value={m.id}>زیردسته‌ی «{m.name}»</option>
            ))}
        </select>
        {hasChildren && <input type="hidden" name="parentId" value="" />}
        <p className="mt-1.5 text-xs text-muted">
          {hasChildren ? "این دسته زیردسته دارد، پس فقط می‌تواند دسته اصلی باشد." : "مثلاً «لنت ترمز» را زیردسته‌ی «لوازم ترمز» قرار دهید. محصولات زیردسته در صفحه دسته اصلی هم نمایش داده می‌شوند."}
        </p>
      </div>

      <fieldset>
        <legend className="label">آیکون</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORY_ICON_NAMES.map((icon) => (
            <label key={icon} className="cursor-pointer">
              <input type="radio" name="icon" value={icon} defaultChecked={icon === (c?.icon ?? "wrench")} aria-label={CATEGORY_ICON_LABELS[icon]} className="peer sr-only" />
              <span className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-bold text-muted transition-colors hover:border-subtle peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                <CategoryIcon name={icon} className="size-5 shrink-0" />
                {CATEGORY_ICON_LABELS[icon]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="cat-desc" className="label">توضیح کوتاه (اختیاری)</label>
        <textarea id="cat-desc" name="description" rows={3} maxLength={600} defaultValue={c?.description ?? ""} placeholder="مثلاً: انواع لنت، دیسک و کاسه ترمز اصلی برای خودروهای داخلی و خارجی" className="input resize-none" />
        <p className="mt-1.5 text-xs text-muted">بالای صفحه این دسته در فروشگاه نمایش داده می‌شود و به دیده‌شدن در گوگل کمک می‌کند.</p>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-line p-4">
        <input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} aria-label="نمایش در فروشگاه" className="size-5 accent-brand" />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">نمایش در فروشگاه</span>
          <span className="text-xs text-muted">اگر خاموش باشد، دسته از منو و صفحه اول حذف می‌شود ولی محصولاتش پاک نمی‌شوند.</span>
        </span>
      </label>

      {state && !state.ok && <p className="rounded-lg bg-brand-soft p-3 text-sm font-bold text-brand" role="alert">{state.message}</p>}

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending} className="btn-primary min-w-40">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {c ? "ذخیره تغییرات" : "افزودن دسته‌بندی"}
        </button>
        <button type="button" onClick={onDone} className="btn-ghost">انصراف</button>
      </div>
    </form>
  );
}

function DeleteForm({ category, all, onDone }: { category: CategoryRow; all: CategoryRow[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(deleteCategory, null);
  const targets = all.filter((c) => c.id !== category.id);
  const needsMove = category.productCount > 0;

  useOnSuccess(state, onDone);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={category.id} />
      <div className="flex items-start gap-3 rounded-xl bg-brand-soft p-4 text-sm leading-7 text-brand">
        <Trash2 className="mt-1 size-5 shrink-0" />
        <p>این کار قابل بازگشت نیست. آیا از حذف این دسته‌بندی مطمئن هستید؟</p>
      </div>

      {needsMove ? (
        targets.length === 0 ? (
          <p className="text-sm leading-7">
            این دسته {faDigits(category.productCount)} محصول دارد و دسته دیگری برای انتقال آن‌ها وجود ندارد. ابتدا یک دسته‌بندی دیگر بسازید.
          </p>
        ) : (
          <div>
            <label htmlFor="move-to" className="label">
              این دسته {faDigits(category.productCount)} محصول دارد. محصولات به کدام دسته منتقل شوند؟ *
            </label>
            <select id="move-to" name="moveTo" required defaultValue="" className="input">
              <option value="" disabled>یک دسته انتخاب کنید</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.parentId ? `   ↳ ${t.name}` : t.name}
                </option>
              ))}
            </select>
          </div>
        )
      ) : (
        <>
          <input type="hidden" name="moveTo" value="" />
          <p className="text-sm text-muted">این دسته محصولی ندارد.</p>
        </>
      )}

      {category.childCount > 0 && (
        <p className="text-sm leading-7 text-muted">
          {faDigits(category.childCount)} زیردسته‌ی این دسته حذف نمی‌شوند و به دسته اصلی تبدیل می‌شوند.
        </p>
      )}

      {state && !state.ok && <p className="rounded-lg bg-brand-soft p-3 text-sm font-bold text-brand" role="alert">{state.message}</p>}

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending || (needsMove && targets.length === 0)} className="btn bg-brand text-white hover:bg-brand-dark">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          بله، حذف شود
        </button>
        <button type="button" onClick={onDone} className="btn-ghost">انصراف</button>
      </div>
    </form>
  );
}
