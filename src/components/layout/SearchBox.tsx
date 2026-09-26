import { Search } from "lucide-react";

export function SearchBox({ defaultValue = "", className = "" }: { defaultValue?: string; className?: string }) {
  return (
    <form action="/search" method="get" role="search" className={className}>
      <label className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-2.5 focus-within:border-brand focus-within:bg-white">
        <Search className="size-5 shrink-0 text-muted" aria-hidden />
        <span className="sr-only">جستجو</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          maxLength={100}
          placeholder="جستجوی قطعه، برند یا کد فنی مورد نظر..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          autoComplete="off"
        />
      </label>
    </form>
  );
}
