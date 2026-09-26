"use client";

import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, Send } from "lucide-react";
import type { TicketState } from "@/app/actions/support";

export function ReplyForm({ ticketId, action }: { ticketId: string; action: (s: TicketState, fd: FormData) => Promise<TicketState> }) {
  const [state, formAction, pending] = useActionState<TicketState, FormData>(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label htmlFor="reply" className="sr-only">پاسخ</label>
      <textarea id="reply" name="body" rows={3} maxLength={3000} required placeholder="پیام خود را بنویسید..." className="input resize-y" />
      {state?.error && <p className="field-error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-fit">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        ارسال پاسخ
      </button>
    </form>
  );
}
