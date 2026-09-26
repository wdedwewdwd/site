"use client";

import { useActionState } from "react";
import { BadgeCheck, LoaderCircle } from "lucide-react";
import { updateAccount, type FormState } from "@/app/actions/profile";
import { Field } from "@/components/ui/Field";
import { faDigits } from "@/lib/format";

type Props = {
  phone: string;
  defaults: { firstName: string; lastName: string; email: string; nationalCode: string };
  next?: string;
};

export function AccountForm({ phone, defaults, next }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateAccount, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="نام" name="firstName" defaultValue={defaults.firstName} error={e.firstName} required maxLength={50} autoComplete="given-name" />
      <Field label="نام خانوادگی" name="lastName" defaultValue={defaults.lastName} error={e.lastName} required maxLength={50} autoComplete="family-name" />
      <div>
        <span className="label">شماره موبایل</span>
        <div className="input flex items-center justify-between bg-surface">
          <span dir="ltr">{faDigits(phone)}</span>
          <span className="flex items-center gap-1 text-xs font-bold text-success">
            <BadgeCheck className="size-4" /> تأیید شده
          </span>
        </div>
      </div>
      <Field label="ایمیل (اختیاری)" name="email" type="email" dir="ltr" defaultValue={defaults.email} error={e.email} maxLength={120} autoComplete="email" />
      <Field
        label="کد ملی (اختیاری)"
        name="nationalCode"
        inputMode="numeric"
        dir="ltr"
        defaultValue={defaults.nationalCode}
        error={e.nationalCode}
        maxLength={10}
        hint="برای صدور فاکتور رسمی به نام شما"
      />
      <div className="flex items-center gap-4 md:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary min-w-40">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          ذخیره تغییرات
        </button>
        {state?.ok && <p className="text-sm font-bold text-success" role="status">{state.message}</p>}
      </div>
    </form>
  );
}
