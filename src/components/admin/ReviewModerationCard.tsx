"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Check, EyeOff, MessageSquareReply, Store, Trash2 } from "lucide-react";
import { deleteReview, replyToReview, setReviewApproved, type ReviewAdminResult } from "@/app/actions/admin/reviews";
import { REPLY_MAX } from "@/lib/reviews-shared";
import { Stars } from "@/components/ui/Stars";
import { toast } from "@/components/ui/Toaster";

export type ModerationReview = {
  id: string;
  rating: number;
  body: string;
  approved: boolean;
  reply: string | null;
  date: string;
  customer: string;
  phone: string;
  buyer: boolean;
  product: { name: string; slug: string; image: string | null };
};

export function ReviewModerationCard({ review }: { review: ModerationReview }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ReviewAdminResult | null>(null);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.reply ?? "");

  const run = (fn: () => Promise<ReviewAdminResult>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      // The card may leave the current tab after this, so success is announced as a toast.
      if (res.ok) {
        toast(res.message);
        setResult(null);
        after?.();
      } else setResult(res);
    });

  return (
    <article className={`card flex flex-col gap-4 p-5 transition-opacity ${pending ? "opacity-60" : ""} ${review.approved ? "" : "border-warning/40"}`}>
      <header className="flex flex-wrap items-center gap-3">
        <Link href={`/product/${review.product.slug}#reviews`} target="_blank" className="flex min-w-0 flex-1 items-center gap-3 hover:text-brand">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface">
            {review.product.image && <Image src={review.product.image} alt="" fill sizes="48px" className="object-cover" />}
          </span>
          <span className="line-clamp-2 text-sm font-bold">{review.product.name}</span>
        </Link>
        <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${review.approved ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
          {review.approved ? "منتشر شده" : "در انتظار تأیید"}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="font-bold text-ink">{review.customer}</span>
        <span dir="ltr">{review.phone}</span>
        {review.buyer && (
          <span className="flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">
            <BadgeCheck className="size-3" aria-hidden /> خریدار این کالا
          </span>
        )}
        <span>{review.date}</span>
        <Stars value={review.rating} className="mr-auto" />
      </div>

      <p className="whitespace-pre-line rounded-xl bg-canvas p-4 text-[13px] leading-7">{review.body}</p>

      {review.reply && !replying && (
        <div className="rounded-xl border-r-4 border-brand bg-brand-soft/40 p-4">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-black">
            <Store className="size-3.5 text-brand" aria-hidden /> پاسخ فروشگاه
          </p>
          <p className="whitespace-pre-line text-[13px] leading-7">{review.reply}</p>
        </div>
      )}

      {replying && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`reply-${review.id}`} className="text-xs font-bold">پاسخ فروشگاه (زیر همین نظر در سایت نمایش داده می‌شود)</label>
          <textarea id={`reply-${review.id}`} value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={REPLY_MAX} autoFocus className="input resize-y leading-7" placeholder="مثلاً: ممنون از نظرتان؛ ..." />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => replyToReview(review.id, reply), () => setReplying(false))} className="btn-primary px-4 py-2 text-xs">
              ذخیره پاسخ
            </button>
            {review.reply && (
              <button type="button" disabled={pending} onClick={() => run(() => replyToReview(review.id, ""), () => { setReply(""); setReplying(false); })} className="btn-ghost px-4 py-2 text-xs text-brand">
                حذف پاسخ
              </button>
            )}
            <button type="button" onClick={() => { setReply(review.reply ?? ""); setReplying(false); }} className="btn-ghost px-4 py-2 text-xs">
              انصراف
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {review.approved ? (
          <button type="button" disabled={pending} onClick={() => run(() => setReviewApproved(review.id, false))} className="btn-ghost px-3 py-2 text-xs">
            <EyeOff className="size-3.5" aria-hidden /> برداشتن از سایت
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => setReviewApproved(review.id, true))} className="btn-primary px-3 py-2 text-xs">
            <Check className="size-3.5" aria-hidden /> تأیید و انتشار
          </button>
        )}
        {!replying && (
          <button type="button" onClick={() => setReplying(true)} className="btn-ghost px-3 py-2 text-xs">
            <MessageSquareReply className="size-3.5" aria-hidden /> {review.reply ? "ویرایش پاسخ" : "پاسخ فروشگاه"}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("این نظر برای همیشه حذف شود؟")) run(() => deleteReview(review.id));
          }}
          className="btn-ghost mr-auto px-3 py-2 text-xs text-brand"
        >
          <Trash2 className="size-3.5" aria-hidden /> حذف
        </button>
        {result && (
          <p className={`w-full text-xs font-bold ${result.ok ? "text-success" : "text-brand"}`} role={result.ok ? "status" : "alert"}>
            {result.message}
          </p>
        )}
      </div>
    </article>
  );
}
