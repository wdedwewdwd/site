"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Live = { visitors: number; pages: { path: string; label: string; href: string | null; visitors: number }[] };

const nf = new Intl.NumberFormat("fa-IR");
const num = (n: number) => nf.format(n).replace(/٬/g, ",");
const REFRESH_MS = 15_000;

/** Visitors on the site in the last 5 minutes and the pages they are on; refreshes itself. */
export function LiveVisitors({ initial }: { initial: Live }) {
  const [live, setLive] = useState(initial);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/admin/analytics/live", { cache: "no-store" });
        if (res.ok && !stopped) setLive(await res.json());
      } catch {}
    };
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  const max = Math.max(1, ...live.pages.map((p) => p.visitors));
  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby="live-title" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="live-title" className="text-base font-black">همین الان در سایت</h2>
          <p className="text-[11px] text-muted">بازدیدکنندگان ۵ دقیقه اخیر · هر ۱۵ ثانیه به‌روز می‌شود</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-success">
          <span className="relative flex size-2.5">
            {live.visitors > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
          <b className="text-lg leading-none">{num(live.visitors)}</b>
          <span className="text-xs font-bold">نفر</span>
        </span>
      </div>
      {live.pages.length === 0 ? (
        <p className="grid h-32 place-items-center rounded-xl bg-canvas text-sm text-muted">الان کسی در سایت نیست.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {live.pages.map((p) => (
            <li key={p.path} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                {p.href ? (
                  <Link href={p.href} target="_blank" className="truncate font-bold hover:text-brand">{p.label}</Link>
                ) : (
                  <span className="truncate font-bold">{p.label}</span>
                )}
                <span className="shrink-0 text-xs text-muted"><b className="text-ink">{num(p.visitors)}</b> نفر</span>
              </div>
              <span className="h-1.5 overflow-hidden rounded-full bg-surface">
                <span className="block h-full rounded-full bg-success" style={{ width: `${Math.max(4, (p.visitors / max) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
