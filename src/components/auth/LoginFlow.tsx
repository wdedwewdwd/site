"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { LoaderCircle, Phone } from "lucide-react";
import { requestOtpAction, verifyOtpAction, type AuthState } from "@/app/actions/auth";
import { LogoMark } from "@/components/brand/Logo";
import { faDigits } from "@/lib/format";
import { MIN_CODE_LENGTH, OTP_LENGTH } from "@/lib/validation";

const RESEND_SEC = 90;

export function LoginFlow({ next, reauth }: { next: string; reauth: boolean }) {
  const [sendState, sendAction, sending] = useActionState<AuthState, FormData>(requestOtpAction, null);
  const [verifyState, verifyAction, verifying] = useActionState<AuthState, FormData>(verifyOtpAction, null);
  const [editing, setEditing] = useState(false);

  const phone = sendState?.phone;
  const onCodeStep = !editing && sendState?.ok && sendState.step === "code" && !!phone && verifyState?.step !== "phone";

  return (
    <div className="w-full max-w-[400px] rounded-3xl border border-line bg-white p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.12)] md:p-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Link href="/" aria-label="صفحه اصلی">
          <LogoMark className="h-12 w-[82px]" />
        </Link>
        <p className="text-xl font-black">آریزون یدک</p>
        <p className="text-[11px] text-muted">بازار آنلاین قطعات خودرو • ARIZON YADAK</p>
      </div>

      {onCodeStep ? (
        <CodeStep
          key={phone}
          phone={phone!}
          next={next}
          action={verifyAction}
          pending={verifying}
          error={verifyState?.error}
          onEdit={() => setEditing(true)}
          resend={sendAction}
          resending={sending}
        />
      ) : (
        <form action={(fd) => { setEditing(false); sendAction(fd); }} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-lg font-black">{reauth ? "ورود مجدد" : "ورود به حساب کاربری"}</h1>
            <p className="text-[13px] text-muted">
              {reauth ? "برای امنیت بیشتر، لطفاً دوباره وارد شوید." : "برای ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید."}
            </p>
          </div>
          <div>
            <label htmlFor="phone" className="label">شماره موبایل</label>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 focus-within:border-brand focus-within:bg-white">
              <Phone className="size-5 text-muted" aria-hidden />
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={14}
                defaultValue={phone ?? ""}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                className="w-full bg-transparent py-3 text-left text-sm tracking-wider focus:outline-none"
                aria-invalid={!!(sendState?.error || verifyState?.step === "phone")}
                aria-describedby="phone-error"
                autoFocus
              />
            </div>
            <p id="phone-error" className="field-error" role="alert">
              {!sendState?.ok ? sendState?.error : verifyState?.step === "phone" ? verifyState.error : ""}
            </p>
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full">
            {sending && <LoaderCircle className="size-4 animate-spin" />}
            ارسال کد تأیید
          </button>
          <p className="border-t border-line pt-4 text-center text-[11px] leading-6 text-muted">
            ورود شما به معنای پذیرش{" "}
            <Link href="/terms" className="text-brand hover:underline">قوانین و مقررات</Link> و{" "}
            <Link href="/privacy" className="text-brand hover:underline">حریم خصوصی</Link> آریزون یدک است.
          </p>
        </form>
      )}
    </div>
  );
}

function CodeStep(props: {
  phone: string;
  next: string;
  action: (fd: FormData) => void;
  pending: boolean;
  error?: string;
  onEdit: () => void;
  resend: (fd: FormData) => void;
  resending: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [left, setLeft] = useState(RESEND_SEC);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    refs.current[0]?.focus();
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const code = digits.join("");
  useEffect(() => {
    if (code.length === OTP_LENGTH && !props.pending) formRef.current?.requestSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const normalize = (v: string) => v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "");

  const setAt = (i: number, value: string) => {
    const clean = normalize(value);
    if (clean.length > 1) {
      // Paste or SMS autofill of the whole code.
      const arr = clean.slice(0, OTP_LENGTH).split("");
      setDigits(Array.from({ length: OTP_LENGTH }, (_, k) => arr[k] ?? ""));
      refs.current[Math.min(arr.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, k) => (k === i ? clean : x)));
    if (clean && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  return (
    <form ref={formRef} action={props.action} className="flex flex-col gap-5">
      <input type="hidden" name="phone" value={props.phone} />
      <input type="hidden" name="next" value={props.next} />
      <input type="hidden" name="code" value={code} />
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-lg font-black">تأیید هویت</h1>
        <p className="text-[13px] text-muted">
          کد {faDigits(OTP_LENGTH)} رقمی ارسال شده به <b dir="ltr">{faDigits(props.phone)}</b> را وارد کنید.
        </p>
        <button type="button" onClick={props.onEdit} className="text-xs font-bold text-brand hover:underline">ویرایش شماره</button>
      </div>

      <fieldset className="flex justify-center gap-2" dir="ltr">
        <legend className="sr-only">کد تأیید</legend>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d ? faDigits(d) : ""}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`رقم ${i + 1}`}
            className={`size-12 rounded-xl border-2 bg-canvas text-center text-lg font-black focus:bg-white focus:outline-none ${
              props.error ? "border-brand" : d ? "border-ink/30" : "border-line focus:border-brand"
            }`}
          />
        ))}
      </fieldset>
      {props.error && <p className="field-error text-center" role="alert">{props.error}</p>}

      <p className="text-center text-xs text-muted">
        {left > 0 ? (
          <>ارسال مجدد کد ({faDigits(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`)})</>
        ) : (
          <button
            type="button"
            disabled={props.resending}
            onClick={() => {
              const fd = new FormData();
              fd.set("phone", props.phone);
              props.resend(fd);
              setLeft(RESEND_SEC);
              setDigits(Array(OTP_LENGTH).fill(""));
            }}
            className="font-bold text-brand hover:underline"
          >
            ارسال مجدد کد
          </button>
        )}
      </p>

      <button type="submit" disabled={props.pending || code.length < MIN_CODE_LENGTH} className="btn-primary w-full">
        {props.pending && <LoaderCircle className="size-4 animate-spin" />}
        تأیید
      </button>
    </form>
  );
}
