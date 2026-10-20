import { Headset, RotateCcw, ShieldCheck, Truck } from "lucide-react";

/** Why buy here, in four short promises (each one is backed by a shop policy page). */
export function FeatureStrip({ hours }: { hours: string }) {
  const items = [
    { Icon: ShieldCheck, title: "ضمانت اصالت کالا", sub: "قطعات اصلی با فاکتور رسمی" },
    { Icon: Truck, title: "ارسال به سراسر کشور", sub: "پست، تیپاکس، باربری و پیک" },
    { Icon: RotateCcw, title: "۷ روز ضمانت بازگشت", sub: "طبق رویه بازگرداندن کالا" },
    { Icon: Headset, title: "پشتیبانی تخصصی", sub: hours },
  ];
  return (
    // Phones: one strip of four (icon over a short title); desktop: four cards with a line of detail each.
    <section aria-label="مزایای خرید از آریزون یدک" className="grid grid-cols-4 rounded-card border border-line bg-white py-3 md:gap-4 md:border-0 md:bg-transparent md:py-0">
      {items.map(({ Icon, title, sub }) => (
        <div
          key={title}
          className="flex flex-col items-center gap-2 px-1 text-center md:flex-row md:gap-3 md:rounded-card md:border md:border-line md:bg-white md:p-4 md:text-right"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand md:size-12">
            <Icon className="size-5 md:size-6" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-extrabold leading-4 md:text-sm md:leading-5">{title}</span>
            <span className="hidden truncate text-xs text-muted md:block">{sub}</span>
          </span>
        </div>
      ))}
    </section>
  );
}
