import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SectionHeader({ title, href, linkLabel = "مشاهده همه" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-black md:text-lg">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center gap-1.5 text-[13px] font-bold text-brand hover:underline">
          {linkLabel}
          <ArrowLeft className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
