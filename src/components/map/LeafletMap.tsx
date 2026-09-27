"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useEffectEvent, useRef } from "react";
import type { Map as LeafletMapType, Marker } from "leaflet";
import type { LatLng } from "@/lib/location";

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52" aria-hidden="true">
  <path d="M20 51s17-17.6 17-31A17 17 0 0 0 3 20c0 13.4 17 31 17 31z" fill="#d52222" stroke="#fff" stroke-width="2.5"/>
  <circle cx="20" cy="20" r="6.5" fill="#fff"/>
</svg>`;

/**
 * OpenStreetMap map with the shop pin. `editable` lets staff click or drag the pin;
 * otherwise the map is a still picture (the parent decides what a click does).
 */
export function LeafletMap({
  center,
  zoom = 16,
  editable = false,
  onChange,
  className = "",
  label = "نقشه موقعیت فروشگاه",
}: {
  center: LatLng;
  zoom?: number;
  editable?: boolean;
  onChange?: (p: LatLng) => void;
  className?: string;
  label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMapType | null>(null);
  const marker = useRef<Marker | null>(null);
  const emit = useEffectEvent((p: LatLng) => onChange?.(p));
  const initial = useRef({ center, zoom });

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !box.current || map.current) return;
      const { center: c, zoom: z } = initial.current;
      const m = L.map(box.current, {
        center: [c.lat, c.lng],
        zoom: z,
        zoomControl: editable,
        dragging: editable,
        scrollWheelZoom: editable ? "center" : false,
        doubleClickZoom: editable,
        touchZoom: editable,
        boxZoom: false,
        keyboard: editable,
        attributionControl: true,
      });
      m.attributionControl.setPrefix(false);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);
      const icon = L.divIcon({ html: PIN_SVG, className: "", iconSize: [40, 52], iconAnchor: [20, 51] });
      const pin = L.marker([c.lat, c.lng], { icon, draggable: editable, keyboard: false, interactive: editable }).addTo(m);
      if (editable) {
        pin.on("dragend", () => {
          const p = pin.getLatLng();
          emit({ lat: p.lat, lng: p.lng });
        });
        m.on("click", (e) => {
          pin.setLatLng(e.latlng);
          emit({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }
      map.current = m;
      marker.current = pin;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [editable]);

  // Follow coordinates typed, pasted or taken from GPS outside the map.
  useEffect(() => {
    const m = map.current;
    const pin = marker.current;
    if (!m || !pin) return;
    const cur = pin.getLatLng();
    if (Math.abs(cur.lat - center.lat) < 1e-7 && Math.abs(cur.lng - center.lng) < 1e-7) return;
    pin.setLatLng([center.lat, center.lng]);
    m.setView([center.lat, center.lng], Math.max(m.getZoom(), 16));
  }, [center.lat, center.lng]);

  return <div ref={box} role="img" aria-label={label} className={`isolate z-0 bg-surface ${className}`} />;
}
