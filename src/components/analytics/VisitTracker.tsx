"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const ENDPOINT = "/api/visit";
const NOT_COUNTED = /^\/(admin|api)(\/|$)/;

// Shared across re-renders (and React's development double effects) so one page is counted once.
let current: { key: string; at: number; id: Promise<string | null> } | null = null;
let firstView = true;

function post(body: object, beacon = false) {
  const data = JSON.stringify(body);
  if (beacon && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(ENDPOINT, new Blob([data], { type: "application/json" }));
    return null;
  }
  return fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: data, keepalive: true, credentials: "same-origin" });
}

/**
 * Counts storefront page views for the admin's visit statistics and, when the visitor leaves a page,
 * how long it was actually on screen. Renders nothing; failures are ignored.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = pathname === "/search" ? (params.get("q") ?? "") : "";
  const src = params.get("utm_source") ?? "";

  useEffect(() => {
    if (!pathname || NOT_COUNTED.test(pathname)) return;
    const key = `${pathname}?${q}`;
    if (!current || current.key !== key || Date.now() - current.at > 1500) {
      const ref = firstView ? document.referrer : "";
      firstView = false;
      const res = post({ t: "view", path: pathname, q: q || undefined, ref: ref || undefined, src: src || undefined });
      current = {
        key,
        at: Date.now(),
        id: (res ?? Promise.resolve(null))
          .then((r) => (r && r.status === 200 ? r.json() : null))
          .then((d: { id?: string } | null) => d?.id ?? null)
          .catch(() => null),
      };
    }
    const view = current;

    // Only time the page is visible counts (a background tab is not someone reading).
    let visibleMs = 0;
    let since: number | null = document.visibilityState === "visible" ? performance.now() : null;
    let reported = 0;
    const elapsed = () => visibleMs + (since !== null ? performance.now() - since : 0);
    const report = () => {
      const ms = Math.round(elapsed());
      if (ms - reported < 1000) return;
      reported = ms;
      void view.id.then((id) => {
        if (id) post({ t: "leave", id, ms }, true);
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (since !== null) visibleMs += performance.now() - since;
        since = null;
        report();
      } else {
        since = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
      report();
    };
  }, [pathname, q, src]);

  return null;
}
