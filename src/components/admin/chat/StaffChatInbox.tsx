"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellOff, ChevronRight, Lock, LockOpen, MessagesSquare, MonitorSmartphone, Phone, Search, Trash2, UserRound, Volume2, VolumeX } from "lucide-react";
import { deleteChatConversation, staffMarkChatRead, staffSendChat, staffSetChatStatus } from "@/app/actions/admin/chat";
import { faDigits, toman } from "@/lib/format";
import { SITE } from "@/lib/shop";
import type { ChatMessageDTO, StaffConversationDTO, StaffCustomerInfo } from "@/lib/chat-types";
import { Composer, MessageList, mergeMessages, relativeTime, type UiMessage } from "@/components/chat/parts";
import { toast } from "@/components/ui/Toaster";
import { useStaffChat } from "./StaffChatProvider";

type Filter = "open" | "unread" | "closed" | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "باز" },
  { key: "unread", label: "خوانده‌نشده" },
  { key: "closed", label: "بسته" },
  { key: "all", label: "همه" },
];

const QUICK_REPLIES = [
  "سلام، وقت بخیر. در خدمتم؛ لطفاً مدل و سال ساخت خودرو را بفرمایید.",
  "اگر امکانش هست، عکس قطعه یا کد فنی (OEM) روی آن را بفرستید تا دقیق راهنمایی کنم.",
  "این قطعه موجود است و می‌توانید همین حالا از سایت سفارش دهید.",
  "متأسفانه این قطعه در حال حاضر موجود نیست؛ به محض موجود شدن به شما اطلاع می‌دهیم.",
  "سفارش شما در حال آماده‌سازی است و به‌زودی ارسال می‌شود.",
  "کد رهگیری مرسوله در بخش «سفارش‌های من» در حساب کاربری شما قابل مشاهده است.",
  `برای هماهنگی بیشتر می‌توانید با شماره ${SITE.supportPhone} تماس بگیرید.`,
  "ممنون از پیام شما؛ اگر سؤال دیگری داشتید در خدمتیم.",
];

const matches = (c: StaffConversationDTO, f: Filter) =>
  f === "all" || (f === "open" && c.status === "OPEN") || (f === "closed" && c.status === "CLOSED") || (f === "unread" && c.status === "OPEN" && c.staffUnread > 0);

type Detail = { conversation: StaffConversationDTO; messages: UiMessage[]; customer: StaffCustomerInfo | null };

let localSeq = 0;
const makeLocalId = () => `local-${++localSeq}-${Date.now()}`;

export function StaffChatInbox({ initialId, isAdmin }: { initialId: string | null; isAdmin: boolean }) {
  const live = useStaffChat();
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");
  const [list, setList] = useState<StaffConversationDTO[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [busy, startBusy] = useTransition();
  const selectedRef = useRef(selectedId);
  // A typing signal can land just after the message it belongs to; ignore those.
  const lastCustomerMessage = useRef(new Map<string, number>());
  const filterRef = useRef(filter);

  useEffect(() => {
    selectedRef.current = selectedId;
    filterRef.current = filter;
    live?.setActive(selectedId);
  }, [selectedId, filter, live]);
  useEffect(() => () => live?.setActive(null), [live]);

  // ── Inbox list ──
  const loadList = useCallback(async (f: Filter, query: string) => {
    const res = await fetch(`/api/admin/chat?status=${f}&q=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (res.ok) setList((await res.json()).conversations);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void loadList(filter, q.trim()), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filter, q, loadList]);

  // ── Selected conversation ──
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    fetch(`/api/admin/chat/${selectedId}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Detail>) : null))
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        if (data && data.conversation.staffUnread > 0) void staffMarkChatRead(selectedId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadKey]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("c", selectedId);
    else url.searchParams.delete("c");
    window.history.replaceState(window.history.state, "", url);
  }, [selectedId]);

  // ── Live events from the shared admin stream ──
  useEffect(() => {
    if (!live) return;
    return live.subscribe((e) => {
      if (e.type === "conversation") {
        const c = e.data;
        setList((cur) => {
          if (!cur) return cur;
          const exists = cur.some((x) => x.id === c.id);
          const next = exists ? cur.map((x) => (x.id === c.id ? c : x)) : matches(c, filterRef.current) ? [c, ...cur] : cur;
          return [...next].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
        });
        if (c.id === selectedRef.current) setDetail((d) => (d ? { ...d, conversation: c } : d));
      } else if (e.type === "message") {
        const m = e.data;
        if (!m.fromStaff) {
          lastCustomerMessage.current.set(m.conversationId, Date.now());
          setTyping((t) => ({ ...t, [m.conversationId]: 0 }));
        }
        if (m.conversationId !== selectedRef.current) return;
        setDetail((d) => {
          if (!d) return d;
          // Our own reply may arrive here before the send action returns: drop its local copy.
          const without = m.fromStaff ? d.messages.filter((x) => !(x.pending === "sending" && x.body === m.body && !x.image === !m.image)) : d.messages;
          return { ...d, messages: mergeMessages(without, [m]) };
        });
        if (!m.fromStaff && document.visibilityState === "visible") void staffMarkChatRead(m.conversationId);
      } else if (e.type === "typing") {
        const id = e.data.conversationId;
        if (Date.now() - (lastCustomerMessage.current.get(id) ?? 0) < 1500) return;
        setTyping((t) => ({ ...t, [id]: Date.now() }));
      }
    });
  }, [live]);

  // Expire "typing…" after a few seconds without a new signal.
  useEffect(() => {
    const t = setInterval(() => {
      setTyping((cur) => {
        const now = Date.now();
        const stale = Object.entries(cur).some(([, at]) => at && now - at > 5000);
        return stale ? Object.fromEntries(Object.entries(cur).map(([k, at]) => [k, at && now - at > 5000 ? 0 : at])) : cur;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const conversation = detail?.conversation.id === selectedId ? detail.conversation : null;
  const closed = conversation?.status === "CLOSED";

  function send(body: string, image: File | null) {
    if (!conversation) return false;
    setError(null);
    const localId = makeLocalId();
    const localImage = image ? URL.createObjectURL(image) : undefined;
    const base: UiMessage = {
      id: localId,
      conversationId: conversation.id,
      fromStaff: true,
      system: false,
      body,
      image: null,
      createdAt: new Date().toISOString(),
      authorName: null,
      localImage,
    };
    const attempt = async () => {
      setDetail((d) => (d ? { ...d, messages: mergeMessages(d.messages, [{ ...base, pending: "sending" }]) } : d));
      const fd = new FormData();
      fd.set("conversationId", conversation.id);
      fd.set("body", body);
      if (image) fd.set("image", image);
      let result: Awaited<ReturnType<typeof staffSendChat>>;
      try {
        result = await staffSendChat(fd);
      } catch {
        result = { ok: false, error: "ارتباط برقرار نشد؛ دوباره تلاش کنید." };
      }
      if (!result.ok) {
        setError(result.error);
        setDetail((d) => (d ? { ...d, messages: d.messages.map((m) => (m.id === localId ? { ...m, pending: "failed", retry: () => void attempt() } : m)) } : d));
        return;
      }
      if (localImage) URL.revokeObjectURL(localImage);
      const sent: ChatMessageDTO = result.message;
      setDetail((d) => (d ? { ...d, messages: mergeMessages(d.messages.filter((m) => m.id !== localId), [sent]) } : d));
    };
    void attempt();
    return true;
  }

  const lastTyping = useRef(0);
  function onTyping() {
    if (!conversation || closed || Date.now() - lastTyping.current < 2500) return;
    lastTyping.current = Date.now();
    void fetch(`/api/admin/chat/typing?c=${conversation.id}`, { method: "POST" }).catch(() => undefined);
  }

  function setStatus(status: "OPEN" | "CLOSED") {
    if (!conversation) return;
    startBusy(async () => {
      const r = await staffSetChatStatus(conversation.id, status);
      if (r.ok) toast(status === "CLOSED" ? "گفتگو بسته شد." : "گفتگو دوباره باز شد.");
      setReloadKey((k) => k + 1);
    });
  }

  function remove() {
    if (!conversation || !confirm(`گفتگوی #${faDigits(conversation.number)} و همه پیام‌ها و تصاویر آن برای همیشه حذف شود؟`)) return;
    startBusy(async () => {
      const r = await deleteChatConversation(conversation.id);
      if (!r.ok) return toast("حذف انجام نشد.", "error");
      toast("گفتگو حذف شد.");
      setList((cur) => cur?.filter((c) => c.id !== conversation.id) ?? cur);
      setSelectedId(null);
      setDetail(null);
    });
  }

  const typingNow = (id: string) => !!typing[id];

  return (
    <div className="card grid h-[calc(100dvh-220px)] min-h-[520px] overflow-hidden md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_280px]">
      {/* ── Conversation list ── */}
      <aside className={`flex min-h-0 flex-col border-line md:border-l ${selectedId ? "max-md:hidden" : ""}`}>
        <div className="flex flex-col gap-3 border-b border-line p-3">
          <label className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو: نام، موبایل یا شماره گفتگو" aria-label="جستجوی گفتگو" className="input py-2 pr-9 text-xs" />
          </label>
          <div className="flex gap-1 rounded-xl bg-canvas p-1" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${filter === f.key ? "bg-white text-ink shadow-sm" : "text-muted"}`}
              >
                {f.label}
                {f.key === "unread" && (live?.unread ?? 0) > 0 && <span className="mr-1 text-brand">{faDigits(live?.unread ?? 0)}</span>}
              </button>
            ))}
          </div>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {list === null && <li className="p-6 text-center text-xs text-muted">در حال بارگذاری…</li>}
          {list?.length === 0 && (
            <li className="flex flex-col items-center gap-2 p-8 text-center text-xs leading-6 text-muted">
              <MessagesSquare className="size-8 text-subtle" aria-hidden />
              {q ? "گفتگویی با این مشخصات پیدا نشد." : filter === "unread" ? "همه پیام‌ها خوانده شده‌اند 👌" : "گفتگویی در این بخش نیست."}
            </li>
          )}
          {list?.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                aria-current={c.id === selectedId ? "true" : undefined}
                className={`flex w-full items-start gap-3 p-3 text-right hover:bg-canvas ${c.id === selectedId ? "bg-brand-soft/60" : ""}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-black ${c.isGuest ? "bg-surface text-muted" : "bg-night text-white"}`}>
                  {c.name.trim().charAt(0) || "؟"}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-sm ${c.staffUnread ? "font-black" : "font-bold"}`}>{c.name}</span>
                    {c.isGuest && <span className="shrink-0 rounded bg-surface px-1.5 text-[10px] text-muted">مهمان</span>}
                    <span className="mr-auto shrink-0 text-[10px] text-muted">{relativeTime(c.lastMessageAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-xs ${typingNow(c.id) ? "font-bold text-success" : c.staffUnread ? "font-bold text-ink" : "text-muted"}`}>
                      {typingNow(c.id) ? "در حال نوشتن…" : c.lastMessage || "—"}
                    </span>
                    {c.status === "CLOSED" && <Lock className="size-3 shrink-0 text-subtle" aria-label="بسته" />}
                    {c.staffUnread > 0 && (
                      <span className="mr-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[10px] font-black text-white">{faDigits(c.staffUnread)}</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1 border-t border-line p-2">
          <button
            type="button"
            onClick={() => live?.setSound(!live.sound)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-muted hover:bg-canvas"
            title="پخش صدا هنگام دریافت پیام جدید"
          >
            {live?.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            {live?.sound ? "صدا روشن" : "صدا خاموش"}
          </button>
          {live && live.desktopAlerts !== "unsupported" && (
            <button
              type="button"
              onClick={live.enableDesktopAlerts}
              disabled={live.desktopAlerts !== "default"}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-muted hover:bg-canvas disabled:hover:bg-transparent"
              title="نمایش اعلان سیستم وقتی این صفحه باز نیست"
            >
              {live.desktopAlerts === "granted" ? <Bell className="size-4 text-success" /> : <BellOff className="size-4" />}
              {live.desktopAlerts === "granted" ? "اعلان فعال" : live.desktopAlerts === "denied" ? "اعلان مسدود" : "فعال‌سازی اعلان"}
            </button>
          )}
        </div>
      </aside>

      {/* ── Conversation ── */}
      <section className={`flex min-h-0 flex-col ${selectedId ? "" : "max-md:hidden"}`}>
        {!selectedId || !conversation ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted">
            <MessagesSquare className="size-12 text-subtle" aria-hidden />
            {selectedId ? "در حال بارگذاری گفتگو…" : "یک گفتگو را از فهرست انتخاب کنید."}
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-line px-3 py-2.5">
              <button type="button" onClick={() => setSelectedId(null)} className="grid size-9 place-items-center rounded-lg hover:bg-canvas md:hidden" aria-label="بازگشت به فهرست">
                <ChevronRight className="size-5" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-black">{conversation.name}</span>
                  <span className="text-[11px] text-muted">#{faDigits(conversation.number)}</span>
                  {conversation.status === "CLOSED" && <span className="rounded bg-surface px-1.5 text-[10px] font-bold text-muted">بسته</span>}
                </span>
                <span className="text-[11px] text-muted">
                  {typingNow(conversation.id) ? <span className="font-bold text-success">در حال نوشتن…</span> : conversation.isGuest ? "مهمان (بدون حساب کاربری)" : "مشتری ثبت‌نام‌شده"}
                </span>
              </div>
              {conversation.phone && (
                <a href={`tel:${conversation.phone}`} className="flex items-center gap-1 rounded-lg bg-success-soft px-2.5 py-1.5 text-xs font-bold text-success" title="تماس با مشتری">
                  <Phone className="size-3.5" /> <span dir="ltr" className="max-sm:hidden">{faDigits(conversation.phone)}</span>
                </a>
              )}
              <button type="button" onClick={() => setShowInfo((v) => !v)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas xl:hidden" aria-label="اطلاعات مشتری">
                <UserRound className="size-5" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus(closed ? "OPEN" : "CLOSED")}
                className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold hover:bg-canvas disabled:opacity-50"
              >
                {closed ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                <span className="max-sm:hidden">{closed ? "باز کردن" : "بستن گفتگو"}</span>
              </button>
              {isAdmin && (
                <button type="button" disabled={busy} onClick={remove} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand disabled:opacity-50" aria-label="حذف گفتگو" title="حذف گفتگو (مثلاً پیام مزاحم)">
                  <Trash2 className="size-4" />
                </button>
              )}
            </header>
            {showInfo && (
              <div className="max-h-64 overflow-y-auto border-b border-line xl:hidden">
                <CustomerPanel conversation={conversation} customer={detail?.customer ?? null} />
              </div>
            )}
            <MessageList
              messages={detail?.messages ?? []}
              isMine={(m) => m.fromStaff}
              seenAt={conversation.customerReadAt}
              typing={typingNow(conversation.id)}
              typingLabel="مشتری در حال نوشتن…"
              showAuthor
              mineTone="dark"
            />
            <Composer
              onSend={send}
              onTyping={onTyping}
              disabled={closed}
              quickReplies={QUICK_REPLIES}
              placeholder={closed ? "این گفتگو بسته است" : "پاسخ به مشتری…"}
              error={error}
              notice={
                closed && (
                  <p className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-xs text-muted">
                    این گفتگو بسته شده است. برای پاسخ دادن، آن را دوباره باز کنید.
                    <button type="button" onClick={() => setStatus("OPEN")} className="font-bold text-brand">باز کردن</button>
                  </p>
                )
              }
            />
          </>
        )}
      </section>

      {/* ── Customer info (wide screens) ── */}
      <aside className="hidden min-h-0 overflow-y-auto border-r border-line xl:block">
        {conversation ? <CustomerPanel conversation={conversation} customer={detail?.customer ?? null} /> : null}
      </aside>
    </div>
  );
}

function CustomerPanel({ conversation: c, customer }: { conversation: StaffConversationDTO; customer: StaffCustomerInfo | null }) {
  return (
    <div className="flex flex-col gap-4 p-4 text-xs">
      <h3 className="text-sm font-black">اطلاعات مشتری</h3>
      <dl className="flex flex-col gap-2.5">
        <Row label="نام">{c.name}</Row>
        <Row label="موبایل">{c.phone ? <a href={`tel:${c.phone}`} dir="ltr" className="font-bold text-info">{faDigits(c.phone)}</a> : "—"}</Row>
        <Row label="نوع">{c.isGuest ? "مهمان" : "عضو سایت"}</Row>
        {customer?.memberSince && <Row label="عضو از">{new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", dateStyle: "medium" }).format(new Date(customer.memberSince))}</Row>}
        <Row label="شروع گفتگو">{relativeTime(c.createdAt)}</Row>
        {c.startedFrom && (
          <Row label="از صفحه">
            <Link href={c.startedFrom} target="_blank" className="inline-flex items-center gap-1 font-bold text-info" dir="ltr">
              <MonitorSmartphone className="size-3.5" /> {decodeURIComponent(c.startedFrom).slice(0, 40)}
            </Link>
          </Row>
        )}
      </dl>
      {customer && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <h4 className="font-black">سابقه خرید</h4>
          <p className="text-muted">
            {faDigits(customer.orderCount)} سفارش پرداخت‌شده · جمع {toman(customer.totalSpent)} تومان
          </p>
          {customer.orders.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {customer.orders.map((o) => (
                <li key={o.number}>
                  <Link href={`/admin/orders/${o.number}`} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2 hover:bg-canvas">
                    <span className="font-bold">#{faDigits(o.number)}</span>
                    <span className="text-muted">{o.statusLabel}</span>
                    <span>{toman(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">هنوز سفارشی ثبت نکرده است.</p>
          )}
        </div>
      )}
      {c.isGuest && <p className="rounded-lg bg-canvas p-3 leading-6 text-muted">این مشتری وارد حساب کاربری نشده است؛ نام و موبایل را خودش وارد کرده است.</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-left font-bold">{children}</dd>
    </div>
  );
}
