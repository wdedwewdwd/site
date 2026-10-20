import { Phone, Search } from "lucide-react";
import { OpenChatButton } from "@/components/chat/OpenChatButton";

/** End of the home page: the part may be in stock even if it is not listed — ask an expert. */
export function HelpCta({ phone, phoneDisplay }: { phone: string; phoneDisplay: string }) {
  return (
    <section
      aria-labelledby="help-title"
      className="relative flex flex-col gap-5 overflow-hidden rounded-xl2 bg-night p-6 text-white md:flex-row md:items-center md:p-8"
    >
      <span aria-hidden className="pointer-events-none absolute -left-10 -top-16 size-56 rounded-full bg-brand/25 blur-3xl" />
      <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-brand shadow-lg shadow-brand/40">
        <Search className="size-7" aria-hidden />
      </span>
      <div className="relative flex flex-1 flex-col gap-1.5">
        <h2 id="help-title" className="text-lg font-black md:text-xl">قطعه‌ای که می‌خواهید را پیدا نکردید؟</h2>
        <p className="text-[13px] leading-7 text-white/70">
          نام خودرو و عکس یا کد فنی قطعه را برای کارشناسان ما بفرستید؛ قیمت و موجودی را در کوتاه‌ترین زمان اعلام می‌کنیم.
        </p>
      </div>
      <div className="relative flex flex-wrap gap-3">
        <OpenChatButton className="btn-primary flex-1 md:flex-none" label="گفتگو با کارشناس" />
        <a href={`tel:${phone}`} className="btn flex-1 border border-white/20 bg-white/5 text-white hover:bg-white/10 md:flex-none">
          <Phone className="size-4" aria-hidden />
          <span dir="ltr">{phoneDisplay}</span>
        </a>
      </div>
    </section>
  );
}
