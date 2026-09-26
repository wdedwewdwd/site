"use client";

import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { changeOwnPassword, type ChangePasswordState } from "@/app/actions/admin-auth";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changeOwnPassword, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-bold">رمز فعلی<input name="current" type="password" autoComplete="current-password" required dir="ltr" className="input py-2" /></label>
        <label className="flex flex-col gap-1 text-xs font-bold">رمز جدید<input name="next" type="password" autoComplete="new-password" required dir="ltr" className="input py-2" /></label>
        <label className="flex flex-col gap-1 text-xs font-bold">تکرار رمز جدید<input name="confirm" type="password" autoComplete="new-password" required dir="ltr" className="input py-2" /></label>
      </div>
      <p className="text-xs text-muted">پیشنهاد: حداقل ۱۰ کاراکتر، ترکیبی از حروف انگلیسی، عدد و علامت.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary py-2.5">
          {pending && <LoaderCircle className="size-4 animate-spin" />} تغییر رمز
        </button>
        {state && <p className={`text-xs font-bold ${state.ok ? "text-success" : "text-brand"}`} role="status">{state.message}</p>}
      </div>
    </form>
  );
}
