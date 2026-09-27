"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveAddress, type FormState } from "@/app/actions/profile";
import { Field } from "@/components/ui/Field";
import { PROVINCES } from "@/lib/iran";

type Address = {
  id: string;
  title: string | null;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  postalCode: string | null;
  fullAddress: string;
  isDefault: boolean;
};

export function AddressForm({ address, next, defaultName, defaultPhone }: { address?: Address; next?: string; defaultName?: string; defaultPhone?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAddress, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2" noValidate>
      <input type="hidden" name="id" value={address?.id ?? ""} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="نام و نام خانوادگی گیرنده" name="receiverName" placeholder="نام کامل را وارد کنید" defaultValue={address?.receiverName ?? defaultName} error={e.receiverName} required maxLength={80} autoComplete="name" />
      <Field label="شماره موبایل گیرنده" name="receiverPhone" placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" inputMode="tel" defaultValue={address?.receiverPhone ?? defaultPhone} error={e.receiverPhone} required maxLength={14} autoComplete="tel" />
      <div>
        <label htmlFor="f-province" className="label">استان</label>
        <select id="f-province" name="province" defaultValue={address?.province ?? "تهران"} className="input" aria-invalid={!!e.province}>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {e.province && <p className="field-error">{e.province}</p>}
      </div>
      <Field label="شهر" name="city" defaultValue={address?.city ?? ""} error={e.city} required maxLength={50} autoComplete="address-level2" />
      <div className="md:col-span-2">
        <label htmlFor="f-fullAddress" className="label">آدرس دقیق پستی</label>
        <textarea
          id="f-fullAddress"
          name="fullAddress"
          rows={3}
          maxLength={300}
          required
          placeholder="نام خیابان، کوچه، پلاک، واحد"
          defaultValue={address?.fullAddress ?? ""}
          className="input resize-none"
          aria-invalid={!!e.fullAddress}
          autoComplete="street-address"
        />
        {e.fullAddress && <p className="field-error">{e.fullAddress}</p>}
      </div>
      <Field label="کد پستی (اختیاری)" name="postalCode" dir="ltr" inputMode="numeric" defaultValue={address?.postalCode ?? ""} error={e.postalCode} maxLength={11} autoComplete="postal-code" hint="۱۰ رقم. اگر نمی‌دانید خالی بگذارید؛ برای دریافت آن با شما تماس می‌گیریم." />
      <Field label="عنوان آدرس (اختیاری)" name="title" placeholder="مثلاً خانه یا محل کار" defaultValue={address?.title ?? ""} error={e.title} maxLength={30} />
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="size-4 accent-brand" />
        آدرس پیش‌فرض من باشد
      </label>
      {state?.message && !state.ok && <p className="field-error md:col-span-2" role="alert">{state.message}</p>}
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary min-w-48">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          ثبت و ذخیره آدرس
        </button>
      </div>
    </form>
  );
}
