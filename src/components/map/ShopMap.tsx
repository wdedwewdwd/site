"use client";

import { Navigation } from "lucide-react";
import { LeafletMap } from "./LeafletMap";
import type { LatLng } from "@/lib/location";
import { GoogleMapsIcon, NeshanIcon } from "@/components/icons/MapApps";

/**
 * Contact page map: a still map of the shop; tapping it (or the button) opens routing in Neshan.
 * The links are the ones pasted in the admin panel, or routing to this map pin (see getContact).
 */
export function ShopMap({ location, address, neshanUrl, googleMapsUrl }: { location: LatLng; address: string; neshanUrl: string; googleMapsUrl: string }) {
  const neshan = neshanUrl;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-64 overflow-hidden rounded-card border border-line md:h-80">
        <LeafletMap center={location} zoom={16} className="h-full w-full" />
        {/* Covers the map (below Leaflet's attribution control) so any tap opens Neshan. */}
        <a href={neshan} target="_blank" rel="noopener" className="absolute inset-0 z-[500]" aria-label={`مسیریابی تا فروشگاه در نشان — ${address}`}>
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-ink shadow-md">
            <Navigation className="size-3.5 text-brand" aria-hidden /> برای مسیریابی روی نقشه بزنید
          </span>
        </a>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={neshan} target="_blank" rel="noopener" className="btn-ghost flex-1 whitespace-nowrap px-4 sm:flex-none">
          <NeshanIcon className="size-5" /> مسیریابی با نشان
        </a>
        <a href={googleMapsUrl} target="_blank" rel="noopener" className="btn-ghost flex-1 whitespace-nowrap px-4 sm:flex-none">
          <GoogleMapsIcon className="size-5" /> مسیریابی با گوگل مپ
        </a>
      </div>
    </div>
  );
}
