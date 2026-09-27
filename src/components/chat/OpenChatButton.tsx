"use client";

import { MessageCircleMore } from "lucide-react";
import { openChat } from "./ChatWidget";

/** Opens the live chat window (rendered once in the shop layout). */
export function OpenChatButton({ className = "btn-primary", label = "شروع گفتگوی آنلاین" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={openChat} className={className}>
      <MessageCircleMore className="size-5" aria-hidden /> {label}
    </button>
  );
}
