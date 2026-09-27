import { Search } from "lucide-react";

/** Product search for the dark site header. */
export function SearchBox({ defaultValue = "", className = "" }: { defaultValue?: string; className?: string }) {
  return (
    <form action="/search" method="get" role="search" className={className}>
      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2.5 transition-colors hover:border-white/20 focus-within:border-white/30 focus-within:bg-white/[0.11] focus-within:ring-2 focus-within:ring-brand/40">
        <Search className="size-5 shrink-0 text-white/50" aria-hidden />
        <span className="sr-only">جستجو</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          maxLength={100}
          placeholder="جستجوی قطعه، برند یا کد فنی مورد نظر..."
          className="w-full bg-transparent text-sm text-white [color-scheme:dark] placeholder:text-white/45 focus:outline-none"
          autoComplete="off"
        />
      </label>
    </form>
  );
}
