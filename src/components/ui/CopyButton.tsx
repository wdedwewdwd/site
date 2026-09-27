"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value, label = "کپی" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // Clipboard blocked; the value is still visible to copy manually.
        }
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-info hover:bg-info-soft"
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? "کپی شد" : label}
    </button>
  );
}
