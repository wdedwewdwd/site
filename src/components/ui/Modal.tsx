"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "md" | "lg";
};

export function Modal({ open, onClose, title, description, children, size = "md" }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the open/close effect on every parent render.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    // Focus the first field so keyboard users can start typing immediately.
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=radio]), select, textarea") ?? panel?.querySelector<HTMLElement>("button"))?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="بستن" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/50 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-black">{title}</h2>
            {description && <p className="text-xs leading-6 text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="بستن" className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
