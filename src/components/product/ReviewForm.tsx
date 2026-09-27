"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, MessageSquarePlus, Pencil, Star, Trash2 } from "lucide-react";
import { deleteOwnReview, submitReview, type ReviewFormState } from "@/app/actions/reviews";
import { REVIEW_MAX, REVIEW_MIN } from "@/lib/reviews-shared";
import { faDigits } from "@/lib/format";
import { Stars } from "@/components/ui/Stars";

const LABELS = ["", "خیلی بد", "بد", "معمولی", "خوب", "عالی"];

type Own = { rating: number; body: string; approved: boolean } | null;

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" role="radiogroup" aria-label="امتیاز شما" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${faDigits(n)} ستاره — ${LABELS[n]}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Star className={`size-7 transition-colors ${n <= shown ? "fill-star text-star" : "fill-line text-line"}`} aria-hidden />
          </button>
        ))}
      </div>
      <span className={`text-xs font-bold ${shown ? "text-ink" : "text-muted"}`}>{shown ? LABELS[shown] : "امتیاز بدهید"}</span>
    </div>
  );
}

function Form({ productId, own, onDone, onCancel }: { productId: string; own: Own; onDone: () => void; onCancel?: () => void }) {
  const [state, setState] = useState<ReviewFormState>(null);
  const [pending, start] = useTransition();
  const [rating, setRating] = useState(own?.rating ?? 0);
  const [body, setBody] = useState(own?.body ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        // Called directly (not through a form action) so the thank-you note survives the page refresh
        // the server triggers; the parent shows it once the saved review comes back.
        start(async () => {
          const res = await submitReview(null, fd);
          setState(res);
          if (res?.ok) onDone();
        });
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <StarPicker value={rating} onChange={setRating} />
      <div>
        <label htmlFor="review-body" className="sr-only">متن نظر</label>
        <textarea
          id="review-body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={REVIEW_MAX}
          placeholder="کیفیت قطعه، اصالت، بسته‌بندی و تجربه نصبش چطور بود؟"
          className="input resize-y leading-7"
        />
        <p className="mt-1 flex items-start justify-between gap-3 text-[11px] leading-5 text-muted">
          <span>نظرها پس از بررسی نمایش داده می‌شوند. لطفاً شماره تماس یا لینک ننویسید.</span>
          <span dir="ltr" className="shrink-0">{faDigits(body.trim().length)}/{faDigits(REVIEW_MAX)}</span>
        </p>
      </div>
      {state && !state.ok && (
        <p className="rounded-lg bg-brand-soft p-3 text-xs font-bold text-brand" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending || !rating || body.trim().length < REVIEW_MIN} className="btn-primary py-2.5">
          {pending && <LoaderCircle className="size-4 animate-spin" />} {own ? "ثبت تغییرات" : "ثبت نظر"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost py-2.5">
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}

/** Review box on the product page: login prompt, the form, or the customer's own review with its status. */
export function ReviewForm({ productId, loggedIn, loginHref, own }: { productId: string; loggedIn: boolean; loginHref: string; own: Own }) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = useCallback(() => {
    setEditing(false);
    setNotice("نظر شما ثبت شد و پس از بررسی و تأیید، روی سایت نمایش داده می‌شود. ممنون از شما!");
  }, []);

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[13px] leading-7 text-muted">این کالا را خریده‌اید یا استفاده کرده‌اید؟ تجربه‌تان به خرید بهتر دیگران کمک می‌کند.</p>
        <Link href={loginHref} className="btn-outline py-2.5">
          <MessageSquarePlus className="size-4" aria-hidden /> ورود و ثبت نظر
        </Link>
      </div>
    );
  }

  if (own && !editing) {
    return (
      <div className="flex flex-col gap-3">
        {notice && (
          <p className="rounded-lg bg-success-soft p-3 text-xs font-bold text-success" role="status">
            {notice}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black">نظر شما</span>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${own.approved ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
            {own.approved ? "منتشر شده" : "در انتظار تأیید"}
          </span>
        </div>
        <Stars value={own.rating} />
        <p className="whitespace-pre-line text-[13px] leading-7">{own.body}</p>
        <div className={`flex gap-2 ${pending ? "opacity-50" : ""}`}>
          <button type="button" onClick={() => { setNotice(null); setEditing(true); }} className="btn-ghost px-3 py-1.5 text-xs">
            <Pencil className="size-3.5" aria-hidden /> ویرایش
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("نظر شما حذف شود؟")) return;
              start(async () => {
                const res = await deleteOwnReview(productId);
                setNotice(res?.ok ? null : (res?.message ?? null));
              });
            }}
            className="btn-ghost px-3 py-1.5 text-xs text-brand"
          >
            <Trash2 className="size-3.5" aria-hidden /> حذف
          </button>
        </div>
      </div>
    );
  }

  return (
    <Form
      key={own ? "edit" : "new"}
      productId={productId}
      own={own}
      onDone={done}
      onCancel={own ? () => setEditing(false) : undefined}
    />
  );
}
