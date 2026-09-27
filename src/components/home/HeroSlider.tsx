"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BannerDTO } from "@/lib/banners-shared";
import { BannerTile } from "./BannerTile";

/**
 * Swipeable banner slider (native scroll-snap, so phones get real finger swiping) with arrows,
 * dots and autoplay. Autoplay pauses while the pointer or keyboard focus is on it, when it is
 * off screen, in a background tab, and for visitors who prefer reduced motion.
 */
export function HeroSlider({ banners, autoplay, priority }: { banners: BannerDTO[]; autoplay: number; priority: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const visible = useRef(true);
  const count = banners.length;

  // Which slide is showing, from the scroll position (works for swipes, arrows and dots alike).
  // RTL scrolling runs from 0 towards negative values, so the distance is taken as absolute.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth));
        setActive(Math.min(count - 1, Math.max(0, i)));
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [count]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function goTo(index: number) {
    const el = track.current;
    const slide = el?.querySelector<HTMLElement>(`[data-index="${(index + count) % count}"]`);
    if (!el || !slide) return;
    // Align the slide's right edge (RTL start) with the track's; avoids scrolling the page itself.
    el.scrollBy({ left: slide.getBoundingClientRect().right - el.getBoundingClientRect().right, behavior: "smooth" });
  }

  useEffect(() => {
    if (!autoplay || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!paused.current && visible.current && document.visibilityState === "visible") goTo(active + 1);
    }, autoplay * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, count, active]);

  const pause = () => (paused.current = true);
  const resume = () => (paused.current = false);

  return (
    <div
      ref={root}
      role="region"
      aria-roledescription="اسلایدر"
      aria-label="بنرهای ویژه"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
      className="group/slider relative aspect-[16/9] @3xl/hero:aspect-[3.4/1]"
    >
      <div
        ref={track}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[20px] [scrollbar-width:none] @3xl/hero:rounded-xl2 [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b, i) => (
          <div
            key={b.id}
            data-index={i}
            role="group"
            aria-roledescription="اسلاید"
            aria-label={`${(i + 1).toLocaleString("fa-IR")} از ${count.toLocaleString("fa-IR")}`}
            className="h-full w-full shrink-0 snap-start snap-always"
          >
            <BannerTile banner={b} sizes="100vw" priority={priority && i === 0} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="بنر قبلی"
            className="absolute right-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-lg transition-opacity hover:bg-white focus-visible:opacity-100 group-hover/slider:opacity-100 @3xl/hero:grid"
          >
            <ChevronRight className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="بنر بعدی"
            className="absolute left-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-lg transition-opacity hover:bg-white focus-visible:opacity-100 group-hover/slider:opacity-100 @3xl/hero:grid"
          >
            <ChevronLeft className="size-6" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 @3xl/hero:bottom-5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`نمایش بنر ${(i + 1).toLocaleString("fa-IR")}`}
                aria-current={i === active ? "true" : undefined}
                className={`h-2 rounded-full shadow transition-all ${i === active ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
