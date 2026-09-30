"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, LayoutGrid, LoaderCircle, Search, X } from "lucide-react";
import { faDigits, toman } from "@/lib/format";

type Suggestion = { slug: string; name: string; price: number; inStock: boolean; image: string | null };
type Results = { products: Suggestion[]; categories: { slug: string; name: string }[]; total: number; partial: boolean };

const MIN_CHARS = 2;

/** Product search for the dark site header, with suggestions while typing. */
export function SearchBox({ className = "" }: { className?: string }) {
  // Reading the URL needs a Suspense boundary; the plain form works until it loads (and without JS).
  return (
    <Suspense fallback={<SearchForm className={className} />}>
      <LiveSearch className={className} />
    </Suspense>
  );
}

function SearchForm({ className }: { className: string }) {
  return (
    <form action="/search" method="get" role="search" className={className}>
      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2.5">
        <Search className="size-5 shrink-0 text-white/50" aria-hidden />
        <span className="sr-only">جستجو</span>
        <input type="search" name="q" maxLength={100} placeholder={PLACEHOLDER} autoComplete="off" className="w-full bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none" />
      </label>
    </form>
  );
}

const PLACEHOLDER = "جستجوی قطعه، خودرو، برند یا کد فنی...";

function LiveSearch({ className }: { className: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  // On the results page the box shows the searched words; elsewhere it starts empty.
  const urlQ = pathname === "/search" ? (params.get("q") ?? "") : "";
  const [shownFor, setShownFor] = useState(urlQ);
  const [q, setQ] = useState(urlQ);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState<{ term: string; data: Results } | null>(null);
  const [active, setActive] = useState(-1);
  if (urlQ !== shownFor) {
    setShownFor(urlQ);
    setQ(urlQ);
    setOpen(false);
  }

  const term = q.trim();
  const results = fetched?.term === term ? fetched.data : null;
  useEffect(() => {
    if (term.length < MIN_CHARS) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          setFetched({ term, data: await res.json() });
          setActive(-1);
        }
      } catch {
        // Aborted by the next keystroke, or offline: the form still submits normally.
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const links = [
    ...(results?.categories ?? []).map((c) => `/category/${c.slug}`),
    ...(results?.products ?? []).map((p) => `/product/${p.slug}`),
  ];
  const showPanel = open && term.length >= MIN_CHARS && results !== null;
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <form
      ref={rootRef}
      action="/search"
      method="get"
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && links[active]) return go(links[active]);
        if (term) go(`/search?q=${encodeURIComponent(term)}`);
      }}
    >
      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2.5 transition-colors hover:border-white/20 focus-within:border-white/30 focus-within:bg-white/[0.11] focus-within:ring-2 focus-within:ring-brand/40">
        {loading ? <LoaderCircle className="size-5 shrink-0 animate-spin text-white/50" aria-hidden /> : <Search className="size-5 shrink-0 text-white/50" aria-hidden />}
        <span className="sr-only">جستجو</span>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (!showPanel || links.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % links.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i <= 0 ? links.length - 1 : i - 1));
            }
          }}
          maxLength={100}
          placeholder={PLACEHOLDER}
          className="w-full bg-transparent text-sm text-white [color-scheme:dark] placeholder:text-white/45 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="پاک کردن" className="shrink-0 text-white/50 hover:text-white">
            <X className="size-4" />
          </button>
        )}
      </label>

      {showPanel && (
        <div id={listId} role="listbox" aria-label="پیشنهادهای جستجو" className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white text-ink shadow-xl ring-1 ring-black/5">
          {results.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-line p-3">
              {results.categories.map((c, i) => (
                <Link
                  key={c.slug}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={active === i}
                  href={`/category/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${active === i ? "bg-brand text-white" : "bg-surface hover:bg-canvas"}`}
                >
                  <LayoutGrid className="size-3.5" aria-hidden /> {c.name}
                </Link>
              ))}
            </div>
          )}

          {results.products.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">قطعه‌ای با «{term}» پیدا نشد. کلمه کوتاه‌تر یا نام خودرو را امتحان کنید.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.partial && <li className="px-4 pb-1 pt-2 text-[11px] font-bold text-warning">دقیقاً پیدا نشد؛ نزدیک‌ترین‌ها:</li>}
              {results.products.map((p, j) => {
                const i = results.categories.length + j;
                return (
                  <li key={p.slug}>
                    <Link
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={active === i}
                      href={`/product/${p.slug}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex items-center gap-3 px-4 py-2.5 ${active === i ? "bg-canvas" : ""}`}
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface">
                        {p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-bold">{p.name}</span>
                        <span className="text-xs text-muted">
                          {p.inStock ? <><b className="text-ink">{toman(p.price)}</b> تومان</> : <span className="font-bold text-brand">ناموجود</span>}
                        </span>
                      </span>
                      <ChevronLeft className="size-4 shrink-0 text-subtle" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(term)}`)} className="flex w-full items-center justify-center gap-2 border-t border-line bg-canvas px-4 py-3 text-[13px] font-extrabold text-brand hover:bg-surface">
            <Search className="size-4" aria-hidden />
            {results.total > 0 ? `مشاهده همه ${faDigits(results.total)} نتیجه برای «${term}»` : `جستجوی کامل «${term}»`}
          </button>
        </div>
      )}
    </form>
  );
}
