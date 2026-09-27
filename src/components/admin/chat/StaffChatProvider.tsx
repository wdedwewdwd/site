"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ChatMessageDTO, StaffConversationDTO } from "@/lib/chat-types";
import { useEventStream } from "@/components/chat/parts";

export type StaffChatEvent =
  | { type: "conversation"; data: StaffConversationDTO }
  | { type: "message"; data: ChatMessageDTO }
  | { type: "typing"; data: { conversationId: string } };

type Ctx = {
  unread: number;
  subscribe: (fn: (e: StaffChatEvent) => void) => () => void;
  /** The conversation open on screen: its new messages don't ring. */
  setActive: (id: string | null) => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  desktopAlerts: NotificationPermission | "unsupported";
  enableDesktopAlerts: () => void;
};

const StaffChatContext = createContext<Ctx | null>(null);
export const useStaffChat = () => useContext(StaffChatContext);

const SOUND_KEY = "ay_chat_sound";
const PREFS_EVENT = "app:chat-prefs";
let audio: AudioContext | null = null;

// Per-browser preferences read with useSyncExternalStore (no hydration mismatch, no effect).
const subscribePrefs = (cb: () => void) => {
  window.addEventListener(PREFS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PREFS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const readSound = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
};
const readPermission = (): NotificationPermission | "unsupported" => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

/** Short two-tone chime made with Web Audio (no sound file needed). */
function chime() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1320, t + 0.13);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  } catch {
    // audio blocked until the user interacts with the page
  }
}

/**
 * One live connection per admin tab. Feeds the chat inbox, the menu badge, the tab title,
 * a chime and (optionally) desktop notifications for new customer messages.
 */
export function StaffChatProvider({ initialUnread, children }: { initialUnread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const sound = useSyncExternalStore(subscribePrefs, readSound, () => true);
  const desktopAlerts = useSyncExternalStore(subscribePrefs, readPermission, () => "default" as const);
  const listeners = useRef(new Set<(e: StaffChatEvent) => void>());
  const active = useRef<string | null>(null);
  const names = useRef(new Map<string, string>());

  const emit = (e: StaffChatEvent) => listeners.current.forEach((fn) => fn(e));

  useEventStream("/api/admin/chat/stream", {
    conversation: (d) => {
      const c = d as StaffConversationDTO;
      names.current.set(c.id, c.name);
      emit({ type: "conversation", data: c });
    },
    message: (d) => {
      const m = d as ChatMessageDTO;
      emit({ type: "message", data: m });
      if (m.fromStaff || m.system) return;
      const watching = active.current === m.conversationId && document.visibilityState === "visible";
      if (watching) return;
      if (sound) chime();
      if (desktopAlerts === "granted" && document.visibilityState !== "visible") {
        const n = new Notification(`پیام جدید از ${names.current.get(m.conversationId) ?? "مشتری"}`, {
          body: m.body || "یک تصویر ارسال کرد",
          tag: m.conversationId,
        });
        n.onclick = () => {
          window.focus();
          router.push(`/admin/chat?c=${m.conversationId}`);
        };
      }
    },
    typing: (d) => emit({ type: "typing", data: d as { conversationId: string } }),
    unread: (d) => setUnread((d as { total: number }).total),
  });

  // "(3) پنل مدیریت" in the browser tab while customers wait for an answer.
  useEffect(() => {
    const base = document.title.replace(/^\(\S+\)\s/, "");
    document.title = unread > 0 ? `(${unread.toLocaleString("fa-IR")}) ${base}` : base;
  }, [unread, pathname]);

  const subscribe = useCallback((fn: (e: StaffChatEvent) => void) => {
    listeners.current.add(fn);
    return () => void listeners.current.delete(fn);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      unread,
      subscribe,
      setActive: (id) => void (active.current = id),
      sound,
      setSound: (on) => {
        try {
          localStorage.setItem(SOUND_KEY, on ? "1" : "0");
        } catch {
          // storage unavailable: the choice lasts until the page reloads
        }
        window.dispatchEvent(new Event(PREFS_EVENT));
        if (on) chime();
      },
      desktopAlerts,
      enableDesktopAlerts: () => {
        if (typeof Notification === "undefined") return;
        void Notification.requestPermission().then(() => window.dispatchEvent(new Event(PREFS_EVENT)));
      },
    }),
    [unread, subscribe, sound, desktopAlerts],
  );

  return <StaffChatContext.Provider value={value}>{children}</StaffChatContext.Provider>;
}
