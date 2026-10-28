"use client";

import { useActionState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { updateAccount, type FormState } from "@/app/actions/profile";
import { LogoTile } from "@/components/brand/Logo";
import { Field } from "@/components/ui/Field";
import { keepValuesOnSubmit } from "@/components/ui/keepValuesOnSubmit";
import { faDigits } from "@/lib/format";

const STEPS = ["شماره موبایل", "کد تأیید", "اطلاعات شما"];

type Props = {
  phone: string;
  next: string;
  defaults: { firstName: string; lastName: string; email: string; nationalCode: string };
};

/** Last step of sign-up (after the SMS code): the customer's name, plus optional email and national code. */
export function WelcomeForm({ phone, next, defaults }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateAccount, null);
  const e = state?.errors ?? {};

  return (
    <div className="w-full max-w-[420px] rounded-3xl border border-line bg-white p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.12)] sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col items-center gap-4">
        {/* Centred on the card's top edge, as on the sign-in card. */}
        <LogoTile className="-mt-[64px] sm:-mt-[68px] md:-mt-[76px]" />
        <ol className="flex w-full items-start justify-center" aria-label="مراحل ثبت‌نام">
          {STEPS.map((label, i) => {
            const done = i < STEPS.length - 1;
            return (
              <li key={label} className="relative flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={done ? undefined : "step"}>
                {i > 0 && <span className={`absolute right-[calc(-50%+16px)] top-3.5 h-0.5 w-[calc(100%-32px)] ${done || i === STEPS.length - 1 ? "bg-brand" : "bg-line"}`} aria-hidden />}
                <span className={`relative grid size-7 place-items-center rounded-full text-xs font-black ${done ? "bg-brand text-white" : "bg-brand-soft text-brand ring-2 ring-brand"}`}>
                  {done ? <Check className="size-4" aria-hidden /> : faDigits(i + 1)}
                </span>
                <span className={`text-[11px] ${done ? "text-muted" : "font-extrabold text-ink"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mb-5 flex flex-col gap-1.5 text-center">
        <h1 className="text-lg font-black">تکمیل ثبت‌نام</h1>
        <p className="text-[13px] leading-6 text-muted">
          شماره <b dir="ltr" className="text-ink">{faDigits(phone)}</b> تأیید شد. نام و نام خانوادگی خود را بنویسید تا سفارش‌ها و فاکتورها به نام شما ثبت شود.
        </p>
      </div>

      <form onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام *" name="firstName" defaultValue={defaults.firstName} error={e.firstName} required maxLength={50} autoComplete="given-name" autoFocus />
          <Field label="نام خانوادگی *" name="lastName" defaultValue={defaults.lastName} error={e.lastName} required maxLength={50} autoComplete="family-name" />
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
        {state && !state.ok && !Object.keys(e).length && <p className="field-error" role="alert">{state.message ?? "ذخیره نشد؛ دوباره تلاش کنید."}</p>}
        <button type="submit" disabled={pending} className="btn-primary mt-1 w-full">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          ثبت و ادامه
        </button>
      </form>

      <form action={logoutAction} className="mt-5 border-t border-line pt-4 text-center">
        <button type="submit" className="text-xs font-bold text-muted hover:text-brand">این شماره من نیست؛ خروج</button>
      </form>
    </div>
  );
}
