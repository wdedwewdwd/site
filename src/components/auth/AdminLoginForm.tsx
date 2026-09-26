"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Phone } from "lucide-react";
import { adminLoginAction, type AdminLoginState } from "@/app/actions/admin-auth";
import { LogoMark } from "@/components/brand/Logo";

export function AdminLoginForm({ next, reauth }: { next: string; reauth: boolean }) {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(adminLoginAction, null);
  const [show, setShow] = useState(false);

  return (
    <div className="w-full max-w-[400px] rounded-3xl border border-line bg-white p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.12)] md:p-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <LogoMark className="h-12 w-[82px]" />
        <p className="text-xl font-black">پنل مدیریت آریزون</p>
        <p className="text-[13px] text-muted">{reauth ? "نشست شما منقضی شد؛ لطفاً دوباره وارد شوید." : "ورود مدیران و پشتیبان‌ها"}</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="phone" className="label">شماره موبایل</label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 focus-within:border-brand focus-within:bg-white">
            <Phone className="size-5 text-muted" aria-hidden />
            <input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="username" required maxLength={14} dir="ltr" className="w-full bg-transparent py-3 text-left text-sm tracking-wider focus:outline-none" autoFocus />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="label">رمز عبور</label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 focus-within:border-brand focus-within:bg-white">
            <LockKeyhole className="size-5 text-muted" aria-hidden />
            <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required maxLength={128} dir="ltr" className="w-full bg-transparent py-3 text-left text-sm focus:outline-none" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"} className="text-muted hover:text-ink">
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        {state?.error && <p className="field-error" role="alert">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          ورود به پنل
        </button>
      </form>
    </div>
  );
}
