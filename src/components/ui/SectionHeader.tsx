import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SectionHeader({ title, titleId, href, linkLabel = "مشاهده همه" }: { title: string; titleId?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={titleId} className="flex items-center gap-2 text-base font-black md:text-lg">
        <span className="h-5 w-1 rounded-full bg-brand" aria-hidden />
        {title}
      </h2>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-brand hover:underline">
          <span className="hidden sm:inline">{linkLabel}</span>
          <span className="sm:hidden">مشاهده همه</span>
          <ArrowLeft className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
