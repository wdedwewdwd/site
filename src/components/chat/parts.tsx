"use client";

import { Fragment, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, Check, CheckCheck, Clock3, ImagePlus, Info, MessageSquareText, RotateCw, SendHorizontal, X } from "lucide-react";
import { CHAT_MAX_IMAGE_BYTES, type ChatMessageDTO } from "@/lib/chat-types";

/** A message in the UI: server messages plus local ones still being sent (or that failed). */
export type UiMessage = ChatMessageDTO & { pending?: "sending" | "failed"; localImage?: string; retry?: () => void };

// ─── Formatting (always Tehran time, Jalali calendar) ────────

const timeFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" });
const dayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", weekday: "long", day: "numeric", month: "long" });
const shortDayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", day: "numeric", month: "long" });

export const chatTime = (iso: string) => timeFmt.format(new Date(iso));

function dayLabel(iso: string) {
  const d = new Date(iso);
  const key = dayKeyFmt.format(d);
  if (key === dayKeyFmt.format(new Date())) return "امروز";
  if (key === dayKeyFmt.format(new Date(Date.now() - 86_400_000))) return "دیروز";
  return dayFmt.format(d);
}

/** "۱۲:۳۰" for today, "دیروز" or a short Jalali date for older items (inbox list). */
export function relativeTime(iso: string) {
  const d = new Date(iso);
  const key = dayKeyFmt.format(d);
  if (key === dayKeyFmt.format(new Date())) return timeFmt.format(d);
  if (key === dayKeyFmt.format(new Date(Date.now() - 86_400_000))) return "دیروز";
  return shortDayFmt.format(d);
}

/** Adds/replaces messages by id and keeps them in time order. */
export function mergeMessages(list: UiMessage[], incoming: UiMessage[]) {
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ─── Live stream hook ───────────────────────────────────────

/** Subscribes to a Server-Sent Events URL; `null` disconnects. Handlers always see fresh state. */
export function useEventStream(url: string | null, handlers: Record<string, (data: unknown) => void>) {
  const onEvent = useEffectEvent((name: string, data: unknown) => handlers[name]?.(data));
  const names = Object.keys(handlers).join(",");
  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    const listeners = names.split(",").map((name) => {
      const fn = (e: MessageEvent) => {
        try {
          onEvent(name, JSON.parse(e.data));
        } catch {
          // ignore malformed events
        }
      };
      es.addEventListener(name, fn);
      return [name, fn] as const;
    });
    return () => {
      for (const [name, fn] of listeners) es.removeEventListener(name, fn);
      es.close();
    };
  }, [url, names]);
}

// ─── Message list ───────────────────────────────────────────

export function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 self-end rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-xs text-muted shadow-sm" role="status">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-bounce rounded-full bg-subtle" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </span>
      {label}
    </div>
  );
}

export function MessageList({
  messages,
  isMine,
  seenAt,
  typing,
  typingLabel,
  showAuthor,
  otherLabel,
  empty,
  mineTone = "brand",
}: {
  messages: UiMessage[];
  isMine: (m: UiMessage) => boolean;
  /** Messages of mine sent at or before this time show "seen" ticks. */
  seenAt: string | null;
  typing: boolean;
  typingLabel: string;
  showAuthor?: boolean;
  otherLabel?: string;
  empty?: React.ReactNode;
  mineTone?: "brand" | "dark";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const last = messages.at(-1);

  // Stick to the bottom when new messages arrive, unless the reader scrolled up to read history.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && (nearBottom.current || (last && isMine(last)))) el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.id, messages.length, typing]);

  const days = messages.map((m) => dayLabel(m.createdAt));
  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain bg-canvas px-3 py-4"
      aria-live="polite"
    >
      {messages.length === 0 && empty}
      {messages.map((m, i) => {
        const day = days[i];
        const showDay = i === 0 || days[i - 1] !== day;
        return (
          <Fragment key={m.id}>
            {showDay && (
              <div className="my-2 flex justify-center">
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-muted shadow-sm">{day}</span>
              </div>
            )}
            {m.system ? (
              <div className="my-1 flex items-start justify-center gap-1.5 px-6 text-center text-[11px] leading-5 text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {m.body}
              </div>
            ) : (
              <Bubble message={m} mine={isMine(m)} seen={!!seenAt && m.createdAt <= seenAt} author={showAuthor ? m.authorName : null} otherLabel={otherLabel} tone={mineTone} />
            )}
          </Fragment>
        );
      })}
      {typing && <TypingDots label={typingLabel} />}
    </div>
  );
}

function Bubble({ message: m, mine, seen, author, otherLabel, tone }: { message: UiMessage; mine: boolean; seen: boolean; author: string | null; otherLabel?: string; tone: "brand" | "dark" }) {
  const mineCls = tone === "brand" ? "bg-brand text-white" : "bg-night text-white";
  const src = m.localImage ?? m.image;
  return (
    <div className={`flex max-w-[82%] flex-col gap-1 ${mine ? "self-start items-start" : "self-end items-end"}`}>
      {!mine && otherLabel && <span className="px-1 text-[10px] font-bold text-muted">{otherLabel}</span>}
      {mine && author && <span className="px-1 text-[10px] font-bold text-muted">{author}</span>}
      <div
        className={`overflow-hidden rounded-2xl text-sm leading-7 shadow-sm ${mine ? `${mineCls} rounded-br-md` : "rounded-bl-md bg-white text-ink"} ${m.pending === "sending" ? "opacity-70" : ""}`}
      >
        {src && (
          <a href={m.image ?? undefined} target="_blank" rel="noopener" className="block" aria-label="نمایش تصویر در اندازه کامل">
            {/* Private, access-checked image: a plain <img> keeps the session cookie and skips the optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="تصویر ارسالی" className="max-h-64 w-full min-w-40 object-cover" loading="lazy" />
          </a>
        )}
        {m.body && <p className="whitespace-pre-wrap break-words px-3.5 py-2 [overflow-wrap:anywhere]">{m.body}</p>}
      </div>
      <span className="flex items-center gap-1 px-1 text-[10px] text-muted">
        {m.pending === "failed" ? (
          <button type="button" onClick={m.retry} className="flex items-center gap-1 font-bold text-brand">
            <AlertCircle className="size-3" /> ارسال نشد · <RotateCw className="size-3" /> تلاش دوباره
          </button>
        ) : (
          <>
            {chatTime(m.createdAt)}
            {mine &&
              (m.pending === "sending" ? (
                <Clock3 className="size-3" aria-label="در حال ارسال" />
              ) : seen ? (
                <CheckCheck className="size-3.5 text-info" aria-label="خوانده شد" />
              ) : (
                <Check className="size-3.5" aria-label="ارسال شد" />
              ))}
          </>
        )}
      </span>
    </div>
  );
}

// ─── Composer ───────────────────────────────────────────────

export function Composer({
  onSend,
  onTyping,
  disabled,
  placeholder = "پیام خود را بنویسید…",
  quickReplies,
  notice,
  error,
}: {
  /** Returns false to keep the draft (e.g. validation failed before sending). */
  onSend: (body: string, image: File | null) => boolean | Promise<boolean>;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  quickReplies?: string[];
  notice?: React.ReactNode;
  error?: string | null;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showQuick, setShowQuick] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // Grow the textarea with its content (up to ~5 lines).
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  function pickImage(file: File | null | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setLocalError("فقط تصویر JPG، PNG یا WEBP قابل ارسال است.");
    if (file.size > CHAT_MAX_IMAGE_BYTES) return setLocalError("حجم تصویر باید کمتر از ۴ مگابایت باشد.");
    setLocalError(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImage(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit() {
    const body = text.trim();
    if ((!body && !image) || disabled) return;
    const ok = await onSend(body, image);
    if (ok) {
      setText("");
      clearImage();
      area.current?.focus();
    }
  }

  const shownError = localError ?? error;
  return (
    <div className="border-t border-line bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {notice}
      {shownError && <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand" role="alert"><AlertCircle className="size-3.5 shrink-0" />{shownError}</p>}
      {preview && (
        <div className="relative mb-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="پیش‌نمایش تصویر" className="h-20 rounded-xl border border-line object-cover" />
          <button type="button" onClick={clearImage} aria-label="حذف تصویر" className="absolute -left-2 -top-2 grid size-6 place-items-center rounded-full bg-ink text-white shadow">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      {showQuick && quickReplies && (
        <ul className="mb-2 flex max-h-44 flex-col gap-1 overflow-y-auto rounded-xl border border-line bg-canvas p-1.5">
          {quickReplies.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => {
                  setText((t) => (t ? `${t} ${q}` : q));
                  setShowQuick(false);
                  area.current?.focus();
                }}
                className="w-full rounded-lg px-3 py-2 text-right text-xs leading-6 hover:bg-white"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={disabled}
          aria-label="ارسال تصویر"
          title="ارسال تصویر (مثلاً عکس قطعه)"
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
        >
          <ImagePlus className="size-5" />
        </button>
        {quickReplies && (
          <button
            type="button"
            onClick={() => setShowQuick((v) => !v)}
            aria-label="پاسخ‌های آماده"
            title="پاسخ‌های آماده"
            className={`grid size-11 shrink-0 place-items-center rounded-xl hover:bg-canvas ${showQuick ? "text-brand" : "text-muted"}`}
          >
            <MessageSquareText className="size-5" />
          </button>
        )}
        <textarea
          ref={area}
          value={text}
          rows={1}
          maxLength={2000}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="متن پیام"
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) onTyping?.();
          }}
          onPaste={(e) => {
            const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
            if (file) {
              e.preventDefault();
              pickImage(file);
            }
          }}
          onKeyDown={(e) => {
            // Enter sends on computers; phones keep Enter for new lines and use the send button.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) {
              e.preventDefault();
              void submit();
            }
          }}
          className="input max-h-36 min-h-11 flex-1 resize-none py-2.5 leading-6"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || (!text.trim() && !image)}
          aria-label="ارسال پیام"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-dark disabled:bg-surface disabled:text-subtle"
        >
          <SendHorizontal className="size-5 -scale-x-100" />
        </button>
      </div>
    </div>
  );
}
