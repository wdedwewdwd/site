"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, MessageSquareText, Send, ShieldAlert } from "lucide-react";
import { saveSmsSettingsAction, setSmsActiveAction, testSmsAction, type SmsFormState } from "@/app/actions/admin/sms";
import { keepValuesOnSubmit } from "@/components/ui/keepValuesOnSubmit";

type Props = {
  initial: { pattern: string; variable: string; line: string };
  hasKey: boolean;
  keyUnreadable: boolean;
  tested: boolean;
  active: boolean;
  /** What happens to login codes while SMS login is off. */
  fallback: string;
  adminPhone: string;
  /** Live balance and lines (server-rendered), once a key is saved. */
  account: React.ReactNode;
};

function Result({ state }: { state: SmsFormState }) {
  if (!state) return null;
  return (
    <p className={`rounded-lg p-3 text-xs font-bold leading-6 ${state.ok ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}`} role={state.ok ? "status" : "alert"}>
      {state.message}
    </p>
  );
}

/** Faraz SMS connection (key, pattern, line) → test message → switch login-by-SMS on. */
export function SmsSettingsForm({ initial, hasKey, keyUnreadable, tested, active, fallback, adminPhone, account }: Props) {
  const [saveState, saveAction, saving] = useActionState<SmsFormState, FormData>(saveSmsSettingsAction, null);
  const [testState, testAction, testing] = useActionState<SmsFormState, FormData>(testSmsAction, null);
  const keyInput = useRef<HTMLInputElement>(null);
  // The key is never shown again: clear the field once it is saved.
  useEffect(() => {
    if (saveState?.ok && keyInput.current) keyInput.current.value = "";
  }, [saveState]);
  const [toggleState, setToggleState] = useState<SmsFormState>(null);
  const [toggling, startToggle] = useTransition();
  const toggle = (on: boolean) =>
    startToggle(async () => {
      setToggleState(await setSmsActiveAction(on));
    });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {/* Status */}
      <section className={`card flex flex-wrap items-center gap-4 p-5 ${active ? "border-success/40" : ""}`}>
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${active ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
          {active ? <CheckCircle2 className="size-6" aria-hidden /> : <ShieldAlert className="size-6" aria-hidden />}
        </span>
        <div className="min-w-48 flex-1">
          <p className="font-black">{active ? "ورود با پیامک فعال است" : "ورود با پیامک خاموش است"}</p>
          <p className="mt-0.5 text-xs leading-6 text-muted">{active ? "کد ورود مشتری‌ها با فراز اس‌ام‌اس پیامک می‌شود." : fallback}</p>
        </div>
        {active ? (
          <button type="button" onClick={() => toggle(false)} disabled={toggling} className="btn-ghost w-full py-2.5 sm:w-auto">
            {toggling && <LoaderCircle className="size-4 animate-spin" />} خاموش کردن
          </button>
        ) : (
          <button type="button" onClick={() => toggle(true)} disabled={toggling || !tested} title={tested ? undefined : "اول یک پیامک آزمایشی موفق بفرستید"} className="btn-primary w-full py-2.5 disabled:opacity-50 sm:w-auto">
            {toggling && <LoaderCircle className="size-4 animate-spin" />} روشن کردن ورود با پیامک
          </button>
        )}
        {!active && !tested && <p className="w-full text-[11px] text-muted">برای روشن کردن، اول تنظیمات را ذخیره و یک پیامک آزمایشی موفق بفرستید.</p>}
        {toggleState && (
          <div className="w-full">
            <Result state={toggleState} />
          </div>
        )}
      </section>

      {/* Connection */}
      <form onSubmit={keepValuesOnSubmit(saveAction)} className="card flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-muted" aria-hidden />
          <h2 className="text-base font-black">۱. اتصال به فراز اس‌ام‌اس</h2>
        </div>
        {keyUnreadable && <p className="rounded-lg bg-warning-soft p-3 text-xs font-bold text-warning">کلید ذخیره‌شده دیگر قابل استفاده نیست (رمز سرور عوض شده)؛ کلید API را دوباره وارد کنید.</p>}
        <label className="flex flex-col gap-1.5">
          <span className="label mb-0">کلید API (از بخش «وب‌سرویس» پنل)</span>
          <input
            ref={keyInput}
            name="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            placeholder={hasKey ? "ذخیره شده — برای عوض کردن، کلید تازه را وارد کنید" : "کلید API را این‌جا جای‌گذاری کنید"}
            className="input text-left font-mono placeholder:font-sans"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="label mb-0">کد پترن</span>
            <input name="pattern" defaultValue={initial.pattern} required dir="ltr" placeholder="SJ3FgPrE0C" spellCheck={false} className="input text-left font-mono" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label mb-0">نام متغیر کد در پترن</span>
            <input name="variable" defaultValue={initial.variable || "code"} required dir="ltr" placeholder="code" spellCheck={false} className="input text-left font-mono" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label mb-0">شماره خط ارسال</span>
            <input name="line" defaultValue={initial.line} required dir="ltr" inputMode="numeric" placeholder="90008361" className="input text-left font-mono" />
          </label>
        </div>
        {account && <div className="rounded-xl bg-canvas p-3">{account}</div>}
        <Result state={saveState} />
        <div>
          <button type="submit" disabled={saving} className="btn-primary py-2.5">
            {saving && <LoaderCircle className="size-4 animate-spin" />} ذخیره تنظیمات
          </button>
        </div>
      </form>

      {/* Test */}
      <form onSubmit={keepValuesOnSubmit(testAction)} className="card flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-muted" aria-hidden />
          <h2 className="text-base font-black">۲. پیامک آزمایشی</h2>
        </div>
        <p className="text-xs leading-6 text-muted">یک کد آزمایشی با همان پترن به این شماره فرستاده می‌شود؛ کدی که این‌جا نوشته می‌شود باید در پیامک هم باشد.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-1 basis-48 flex-col gap-1.5">
            <span className="label mb-0">شماره موبایل</span>
            <input name="phone" defaultValue={adminPhone} required dir="ltr" inputMode="tel" className="input text-left" />
          </label>
          <button type="submit" disabled={testing || !hasKey} className="btn-ghost py-3 disabled:opacity-50">
            {testing ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" aria-hidden />} ارسال پیامک آزمایشی
          </button>
        </div>
        {tested && !testState && <p className="text-xs font-bold text-success">آخرین آزمایش با همین تنظیمات موفق بوده است.</p>}
        <Result state={testState} />
      </form>
    </div>
  );
}
