"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Clock, Headset, Phone, X } from "lucide-react";
import { markChatRead, sendChatMessage } from "@/app/actions/chat";
import { SITE } from "@/lib/shop";
import { faDigits } from "@/lib/format";
import type { ChatMessageDTO, CustomerChatSnapshot, CustomerChatState } from "@/lib/chat-types";
import { SupportChannels, type SupportContact } from "@/components/support/SupportChannels";
import { Composer, MessageList, mergeMessages, useEventStream, type UiMessage } from "./parts";

/** Any button on the site can open the chat with `openChat()`. */
export const OPEN_CHAT_EVENT = "app:open-chat";
export function openChat() {
  window.dispatchEvent(new Event(OPEN_CHAT_EVENT));
}

/** Remembers (per browser) that this visitor has a chat, so we only call the server when there is something to show. */
const ACTIVE_KEY = "ay_chat_active";
const readFlag = () => {
  try {
    return localStorage.getItem(ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
};
const writeFlag = () => {
  try {
    localStorage.setItem(ACTIVE_KEY, "1");
  } catch {
    // storage unavailable (private mode): the chat still works while the page is open
  }
};

let localSeq = 0;
/** Temporary id for a message until the server confirms it. */
const makeLocalId = () => `local-${++localSeq}-${Date.now()}`;

const TOPICS = ["استعلام قیمت و موجودی قطعه", "مشاوره برای انتخاب قطعه مناسب", "پیگیری سفارش", "شرایط ارسال و مرجوعی"];

/**
 * The floating "پشتیبانی" button (a menu of ways to reach support: phone, live chat, Instagram,
 * WhatsApp) and the live chat window it can open.
 */
export function ChatWidget({ support }: { support: SupportContact }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRoot = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<CustomerChatSnapshot | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [state, setState] = useState<CustomerChatState | null>(null);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [needsContact, setNeedsContact] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<ChatMessageDTO | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTypingSent = useRef(0);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) return;
      const data: CustomerChatSnapshot = await res.json();
      setSnapshot(data);
      setMessages(data.messages);
      setState(data.conversation);
      setNeedsContact(!data.me.loggedIn && !data.conversation);
      if (data.conversation?.unread) setPreview(data.messages.findLast((m) => m.fromStaff && !m.system) ?? null);
      if (data.conversation) {
        writeFlag();
        const since = data.messages.at(-1)?.createdAt ?? new Date().toISOString();
        setStreamUrl(`/api/chat/stream?since=${encodeURIComponent(since)}`);
      }
    } finally {
      loading.current = false;
    }
  }, []);

  // Returning visitors: restore the chat (unread badge + live replies) without opening it.
  useEffect(() => {
    if (readFlag()) void load();
  }, [load]);

  // Open from anywhere: openChat(), or a link with ?chat=1 (e.g. from a notification).
  useEffect(() => {
    const onOpen = () => {
      setMenuOpen(false);
      setOpen(true);
      void load();
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, [load]);
  useEffect(() => {
    if (searchParams.get("chat") === "1") openChat();
  }, [searchParams]);

  useEventStream(streamUrl, {
    message: (data) => {
      const m = data as ChatMessageDTO;
      setMessages((list) => {
        // Our own message may arrive here before the send action returns: drop its local copy.
        const withoutLocal = m.fromStaff ? list : list.filter((x) => !(x.pending === "sending" && x.body === m.body && !x.image === !m.image));
        return mergeMessages(withoutLocal, [m]);
      });
      if (m.fromStaff) {
        setTyping(false);
        if (!m.system) setPreview(m);
      }
    },
    state: (data) => setState(data as CustomerChatState),
    typing: () => {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 5000);
    },
  });

  const unread = state?.unread ?? 0;
  // Reading the open chat clears the badge and shows "seen" to support.
  useEffect(() => {
    if (!open || unread === 0) return;
    const markRead = () => {
      if (document.visibilityState !== "visible") return;
      setState((s) => (s ? { ...s, unread: 0 } : s));
      setPreview(null);
      void markChatRead();
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [open, unread]);

  // Lock page scroll behind the full-screen chat on phones.
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 767px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => void (document.body.style.overflow = prev);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const closed = state?.status === "CLOSED";
  const online = state?.online ?? snapshot?.online ?? false;

  function send(body: string, image: File | null) {
    if (needsContact && (contact.name.trim().length < 2 || !contact.phone.trim())) {
      setError("برای شروع گفتگو، نام و شماره موبایل خود را وارد کنید.");
      return false;
    }
    setError(null);
    const startsNew = !state || closed;
    const localId = makeLocalId();
    const localImage = image ? URL.createObjectURL(image) : undefined;
    const base: UiMessage = { id: localId, conversationId: "", fromStaff: false, system: false, body, image: null, createdAt: new Date().toISOString(), authorName: null, localImage };

    const attempt = async () => {
      setMessages((list) => mergeMessages(list, [{ ...base, pending: "sending" }]));
      const fd = new FormData();
      fd.set("body", body);
      if (image) fd.set("image", image);
      fd.set("page", pathname);
      if (needsContact) {
        fd.set("name", contact.name);
        fd.set("phone", contact.phone);
      }
      let result: Awaited<ReturnType<typeof sendChatMessage>>;
      try {
        result = await sendChatMessage(fd);
      } catch {
        result = { ok: false, error: "ارتباط برقرار نشد؛ اتصال اینترنت را بررسی کنید." };
      }
      if (!result.ok) {
        if (result.needsContact) {
          setNeedsContact(true);
          setMessages((list) => list.filter((m) => m.id !== localId));
        } else {
          setMessages((list) => list.map((m) => (m.id === localId ? { ...m, pending: "failed", retry: () => void attempt() } : m)));
        }
        setError(result.error);
        return;
      }
      if (localImage) URL.revokeObjectURL(localImage);
      setMessages((list) => mergeMessages(list.filter((m) => m.id !== localId), [result.message]));
      setNeedsContact(false);
      writeFlag();
      // A brand-new conversation: reload so the old (closed) history and stream are replaced.
      if (startsNew) await load();
    };
    void attempt();
    return true;
  }

  function onTyping() {
    if (!state || closed || Date.now() - lastTypingSent.current < 2500) return;
    lastTypingSent.current = Date.now();
    void fetch("/api/chat/typing", { method: "POST" }).catch(() => undefined);
  }

  // The support menu closes on Escape or a click anywhere else.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRoot.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (pathname.startsWith("/checkout")) return null;

  return (
    <>
      {!open && (
        <div ref={menuRoot} className="fixed bottom-20 left-4 z-40 flex flex-col items-start gap-2 md:bottom-6 md:left-6">
          {menuOpen && (
            <div
              id="support-menu"
              role="dialog"
              aria-label="راه‌های ارتباط با پشتیبانی"
              className="absolute bottom-[calc(100%+12px)] left-0 w-[min(20rem,calc(100vw-2rem))] origin-bottom-left animate-pop-in overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 bg-night px-4 py-3.5 text-white">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-black">پشتیبانی {SITE.name}</span>
                  <span className="text-[11px] text-white/70">از چه راهی با ما در ارتباط باشید؟</span>
                </div>
                <button type="button" onClick={() => setMenuOpen(false)} aria-label="بستن" className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <SupportChannels contact={support} onChat={openChat} onPick={() => setMenuOpen(false)} unread={unread} online={state?.online ?? snapshot?.online ?? null} />
              <p className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-[11px] text-muted">
                <Clock className="size-3.5 shrink-0" aria-hidden /> ساعات پاسخگویی: {support.hours}
              </p>
            </div>
          )}
          {!menuOpen && preview && unread > 0 && (
            <button
              type="button"
              onClick={openChat}
              className="max-w-64 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3 text-right text-xs leading-6 shadow-lg"
            >
              <span className="block font-extrabold text-brand">پاسخ پشتیبانی</span>
              <span className="line-clamp-2 text-ink">{preview.body || "یک تصویر برای شما ارسال شد"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              // Fresh "online" status for the menu.
              if (!menuOpen) void load();
            }}
            aria-expanded={menuOpen}
            aria-controls="support-menu"
            aria-label={menuOpen ? "بستن منوی پشتیبانی" : unread ? `پشتیبانی — ${faDigits(unread)} پیام خوانده‌نشده` : "پشتیبانی"}
            className="group relative flex h-14 items-center gap-2 rounded-full bg-brand pl-5 pr-4 text-white shadow-lg shadow-brand/30 transition-transform hover:scale-[1.03] hover:bg-brand-dark max-md:w-14 max-md:justify-center max-md:p-0"
          >
            {menuOpen ? <X className="size-6" aria-hidden /> : <Headset className="size-6" aria-hidden />}
            <span className="text-sm font-extrabold max-md:hidden">{menuOpen ? "بستن" : "پشتیبانی"}</span>
            {!menuOpen && unread > 0 && (
              <span className="absolute -top-1 -right-1 grid min-w-6 place-items-center rounded-full border-2 border-white bg-ink px-1 text-[11px] font-black">{faDigits(unread)}</span>
            )}
          </button>
        </div>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="گفتگوی آنلاین با پشتیبانی"
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-white md:inset-auto md:bottom-6 md:left-6 md:h-[640px] md:max-h-[calc(100dvh-48px)] md:w-[400px] md:rounded-2xl md:border md:border-line md:shadow-2xl"
        >
          <header className="flex items-center gap-3 bg-night px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white/10">
              <Headset className="size-6" aria-hidden />
              <span className={`absolute bottom-0 left-0 size-3 rounded-full border-2 border-night ${online ? "bg-green-500" : "bg-subtle"}`} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-black">پشتیبانی آنلاین {SITE.name}</span>
              <span className="text-[11px] text-white/70">{online ? "آنلاین · معمولاً در چند دقیقه پاسخ می‌دهیم" : "پیام بگذارید؛ در اولین فرصت پاسخ می‌دهیم"}</span>
            </div>
            <a href={`tel:${support.phone}`} aria-label="تماس تلفنی با پشتیبانی" className="grid size-10 place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white">
              <Phone className="size-5" />
            </a>
            <button type="button" onClick={() => setOpen(false)} aria-label="بستن گفتگو" className="grid size-10 place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white">
              <ChevronDown className="size-6" />
            </button>
          </header>

          <MessageList
            messages={messages}
            isMine={(m) => !m.fromStaff}
            seenAt={state?.staffReadAt ?? null}
            typing={typing && !closed}
            typingLabel="پشتیبان در حال نوشتن…"
            otherLabel="پشتیبانی"
            empty={
              <div className="flex flex-col gap-4">
                <div className="self-end rounded-2xl rounded-bl-md bg-white p-4 text-sm leading-7 shadow-sm">
                  <p className="font-extrabold">سلام، وقت بخیر 👋</p>
                  <p className="text-muted">
                    سؤال خود را درباره قیمت، موجودی یا انتخاب قطعه بپرسید. برای پاسخ دقیق‌تر، <strong className="text-ink">مدل و سال خودرو</strong> را بنویسید و اگر می‌توانید{" "}
                    <strong className="text-ink">عکس قطعه</strong> را هم بفرستید.
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => send(t, null)}
                      className="rounded-full border border-brand/30 bg-white px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            }
          />

          <Composer
            onSend={send}
            onTyping={onTyping}
            error={error}
            notice={
              <>
                {closed && (
                  <p className="mb-2 rounded-xl bg-surface px-3 py-2 text-xs leading-6 text-muted">این گفتگو بسته شده است. با ارسال پیام جدید، گفتگوی تازه‌ای شروع می‌شود.</p>
                )}
                {needsContact && (
                  <div className="mb-2 flex flex-col gap-2">
                    <p className="text-xs leading-6 text-muted">
                      برای پیگیری پاسخ، نام و موبایل خود را وارد کنید
                      {" "}یا <Link href={`/login?next=${encodeURIComponent(`${pathname}?chat=1`)}`} className="font-bold text-brand">وارد حساب شوید</Link>.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={contact.name}
                        onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                        placeholder="نام شما"
                        aria-label="نام شما"
                        maxLength={60}
                        autoComplete="name"
                        className="input py-2"
                      />
                      <input
                        value={contact.phone}
                        onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                        placeholder="موبایل ۰۹…"
                        aria-label="شماره موبایل"
                        inputMode="tel"
                        dir={contact.phone ? "ltr" : "rtl"}
                        maxLength={14}
                        autoComplete="tel"
                        className="input py-2 text-right"
                      />
                    </div>
                  </div>
                )}
              </>
            }
          />
        </section>
      )}
    </>
  );
}
