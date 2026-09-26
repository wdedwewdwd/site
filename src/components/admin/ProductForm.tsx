"use client";

import Image from "next/image";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveProduct, type ProductFormState } from "@/app/actions/admin/products";
import { Field } from "@/components/ui/Field";

type Opt = { id: string; name: string };
type Product = {
  id: string; name: string; slug: string; sku: string; oemCode: string | null; categoryId: string; brandId: string | null;
  price: number; compareAtPrice: number | null; stock: number; warranty: string | null; madeIn: string | null;
  weightGrams: number | null; description: string | null; specs: unknown; isActive: boolean; isFeatured: boolean;
  images: { id: string; url: string }[]; fitments: { carModelId: string }[];
};

export function ProductForm({ product, categories, brands, cars }: { product?: Product; categories: Opt[]; brands: Opt[]; cars: Opt[] }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, null);
  const e = state?.errors ?? {};
  const specs = Array.isArray(product?.specs) ? (product.specs as { label: string; value: string }[]).map((s) => `${s.label}: ${s.value}`).join("\n") : "";
  const fits = new Set(product?.fitments.map((f) => f.carModelId));

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_340px]" noValidate>
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <div className="flex flex-col gap-6">
        <section className="card grid gap-5 p-5 md:grid-cols-2">
          <h2 className="text-base font-black md:col-span-2">اطلاعات پایه</h2>
          <Field label="نام محصول" name="name" defaultValue={product?.name} error={e.name} className="md:col-span-2" required />
          <Field label="نامک (URL)" name="slug" dir="ltr" defaultValue={product?.slug} error={e.slug} hint="مثال: bosch-brake-pad-206" required />
          <Field label="کد کالا (SKU)" name="sku" dir="ltr" defaultValue={product?.sku} error={e.sku} required />
          <Field label="کد فنی (OEM)" name="oemCode" dir="ltr" defaultValue={product?.oemCode ?? ""} error={e.oemCode} />
          <div>
            <label htmlFor="f-cat" className="label">دسته‌بندی</label>
            <select id="f-cat" name="categoryId" defaultValue={product?.categoryId} className="input" required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-brand" className="label">برند</label>
            <select id="f-brand" name="brandId" defaultValue={product?.brandId ?? ""} className="input">
              <option value="">بدون برند</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Field label="کشور سازنده" name="madeIn" defaultValue={product?.madeIn ?? ""} error={e.madeIn} />
          <div className="md:col-span-2">
            <label htmlFor="f-desc" className="label">توضیحات</label>
            <textarea id="f-desc" name="description" rows={5} maxLength={5000} defaultValue={product?.description ?? ""} className="input resize-y" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="f-specs" className="label">مشخصات فنی (هر خط: عنوان: مقدار)</label>
            <textarea id="f-specs" name="specs" rows={4} maxLength={3000} defaultValue={specs} className="input resize-y" placeholder={"جنس: سرامیکی\nتعداد در بسته: ۴ عدد"} />
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-base font-black">تصاویر</h2>
          {product && product.images.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {product.images.map((img) => (
                <li key={img.id} className="flex flex-col items-center gap-1">
                  <span className="relative size-24 overflow-hidden rounded-lg bg-surface">
                    <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
                  </span>
                  <label className="flex items-center gap-1 text-xs text-brand">
                    <input type="checkbox" name="removeImage" value={img.id} className="accent-brand" /> حذف
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div>
            <label htmlFor="f-images" className="label">افزودن تصویر (JPG / PNG / WEBP، حداکثر ۴ مگابایت)</label>
            <input id="f-images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="block w-full text-sm file:ml-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-bold file:text-brand" />
            {e.images && <p className="field-error">{e.images}</p>}
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-base font-black">خودروهای سازگار</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cars.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="fitments" value={c.id} defaultChecked={fits.has(c.id)} className="size-4 accent-brand" />
                {c.name}
              </label>
            ))}
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-6">
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-base font-black">قیمت و موجودی</h2>
          <Field label="قیمت فروش (تومان)" name="price" inputMode="numeric" dir="ltr" defaultValue={product?.price} error={e.price} required />
          <Field label="قیمت قبل از تخفیف (اختیاری)" name="compareAtPrice" inputMode="numeric" dir="ltr" defaultValue={product?.compareAtPrice ?? ""} error={e.compareAtPrice} />
          <Field label="موجودی انبار" name="stock" inputMode="numeric" dir="ltr" defaultValue={product?.stock ?? 0} error={e.stock} required />
          <Field label="وزن (گرم)" name="weightGrams" inputMode="numeric" dir="ltr" defaultValue={product?.weightGrams ?? ""} error={e.weightGrams} />
          <Field label="ضمانت" name="warranty" defaultValue={product?.warranty ?? ""} error={e.warranty} />
        </section>
        <section className="card flex flex-col gap-3 p-5">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} className="size-4 accent-brand" /> نمایش در فروشگاه
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} className="size-4 accent-brand" /> محصول ویژه
          </label>
        </section>
        {(state?.error || Object.keys(e).length > 0) && (
          <p className="rounded-lg bg-brand-soft p-3 text-xs font-bold text-brand" role="alert">{state?.error ?? "لطفاً خطاهای فرم را برطرف کنید."}</p>
        )}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          ذخیره محصول
        </button>
      </aside>
    </form>
  );
}
