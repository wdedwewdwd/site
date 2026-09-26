"use client";

import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import type { AdminFormState } from "@/app/actions/admin/misc";

/** Small wrapper for admin forms: pending state, result message, reset on success. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  resetOnSuccess = false,
}: {
  action: (s: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary py-2.5">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {submitLabel}
        </button>
        {state && <p className={`text-xs font-bold ${state.ok ? "text-success" : "text-brand"}`} role="status">{state.ok ? state.message : state.error}</p>}
      </div>
    </form>
  );
}
