"use client";

import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <div className="flex flex-col gap-4">
      <div className="card relative aspect-[4/3] overflow-hidden p-6 md:p-8">
        {current && (
          <div className="relative size-full overflow-hidden rounded-xl bg-surface">
            <Image src={current.url} alt={current.alt ?? name} fill priority sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-3" role="tablist" aria-label="تصاویر محصول">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`تصویر ${i + 1}`}
              onClick={() => setActive(i)}
              className={`relative size-[72px] overflow-hidden rounded-xl border-2 bg-white p-1.5 ${i === active ? "border-brand" : "border-line"}`}
            >
              <span className="relative block size-full overflow-hidden rounded-lg">
                <Image src={img.url} alt="" fill sizes="72px" className="object-cover" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
