"use client";

import { useActionState, useState } from "react";
import { Crosshair, ExternalLink, LoaderCircle, MapPin, Trash2 } from "lucide-react";
import { saveShopLocation, type AdminFormState } from "@/app/actions/admin/misc";
import { LeafletMap } from "@/components/map/LeafletMap";
import { DEFAULT_CENTER, inIran, neshanRouteUrl, parseLatLng, roundCoord, type LatLng } from "@/lib/location";
import { toEnDigits } from "@/lib/validation";

/** Admin picker for the shop pin: click/drag on the map, use the phone's GPS, or paste a Neshan/Google link. */
export function ShopLocationForm({ saved }: { saved: LatLng | null }) {
  const [point, setPoint] = useState<LatLng>(saved ?? DEFAULT_CENTER);
  // Raw text of the coordinate boxes, so typing "35." isn't cut short by number parsing.
  const [latText, setLatText] = useState(String(point.lat));
  const [lngText, setLngText] = useState(String(point.lng));
  const [touched, setTouched] = useState(false);
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [state, action, pending] = useActionState<AdminFormState, FormData>(saveShopLocation, null);

  const set = (p: LatLng) => {
    const next = { lat: roundCoord(p.lat), lng: roundCoord(p.lng) };
    setPoint(next);
    setLatText(String(next.lat));
    setLngText(String(next.lng));
    setTouched(true);
  };

  function typed(which: "lat" | "lng", value: string) {
    (which === "lat" ? setLatText : setLngText)(value);
    const n = Number(toEnDigits(value).trim());
    if (value.trim() && Number.isFinite(n)) {
      setPoint((p) => ({ ...p, [which]: n }));
      setTouched(true);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) return setNote("مرورگر شما موقعیت‌یابی را پشتیبانی نمی‌کند.");
    setLocating(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!inIran(p)) return setNote("موقعیت دریافت‌شده داخل ایران نیست.");
        set(p);
        setNote(`موقعیت شما با دقت حدود ${Math.round(pos.coords.accuracy).toLocaleString("fa-IR")} متر دریافت شد. در صورت نیاز پین را جابه‌جا کنید.`);
      },
      () => {
        setLocating(false);
        setNote("دسترسی به موقعیت داده نشد. اجازه موقعیت‌یابی را در مرورگر فعال کنید یا نقطه را روی نقشه انتخاب کنید.");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  const valid = inIran(point);
  return (
    <form action={action} className="flex flex-col gap-4">
      <LeafletMap center={point} editable onChange={set} className="h-80 w-full overflow-hidden rounded-xl border border-line md:h-96" label="نقشه برای انتخاب موقعیت فروشگاه" />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={locateMe} disabled={locating} className="btn-ghost py-2 text-xs">
          {locating ? <LoaderCircle className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
          استفاده از موقعیت فعلی من (GPS)
        </button>
        <a href={neshanRouteUrl(point)} target="_blank" rel="noopener" className="btn-ghost py-2 text-xs">
          <ExternalLink className="size-4" /> آزمایش مسیریابی در نشان
        </a>
      </div>
      {note && <p className="text-xs leading-6 text-muted">{note}</p>}

      <label className="flex flex-col gap-1 text-xs font-bold">
        یا لینک موقعیت از نشان / گوگل‌مپ یا مختصات را اینجا بچسبانید
        <input
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value);
            const p = parseLatLng(e.target.value);
            if (p) {
              set(p);
              setNote("مختصات از لینک خوانده شد.");
            } else if (e.target.value.trim()) setNote("مختصاتی در این متن پیدا نشد؛ لینکی را بچسبانید که عدد عرض و طول جغرافیایی در آن باشد.");
          }}
          dir="ltr"
          placeholder="https://neshan.org/maps/…  یا  35.6935, 51.4258"
          className="input py-2 text-left font-normal"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-bold">
          عرض جغرافیایی (Latitude)
          <input
            name="lat"
            value={latText}
            onChange={(e) => typed("lat", e.target.value)}
            dir="ltr"
            inputMode="decimal"
            className="input py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          طول جغرافیایی (Longitude)
          <input
            name="lng"
            value={lngText}
            onChange={(e) => typed("lng", e.target.value)}
            dir="ltr"
            inputMode="decimal"
            className="input py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !valid} className="btn-primary py-2.5">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          ذخیره موقعیت فروشگاه
        </button>
        {saved && (
          <button type="submit" name="clear" value="1" disabled={pending} formNoValidate className="btn-ghost py-2.5 text-brand">
            <Trash2 className="size-4" /> حذف از سایت
          </button>
        )}
        {!saved && !touched && <span className="text-xs text-muted">هنوز موقعیتی ذخیره نشده و نقشه در سایت نمایش داده نمی‌شود.</span>}
        {state && <p className={`text-xs font-bold ${state.ok ? "text-success" : "text-brand"}`} role="status">{state.ok ? state.message : state.error}</p>}
      </div>
    </form>
  );
}
