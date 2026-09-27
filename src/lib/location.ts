import { toEnDigits } from "./validation";

/** Shared by the admin location picker and the contact page map. */
export type LatLng = { lat: number; lng: number };

// Generous box around Iran: rejects swapped or mistyped coordinates.
const BOUNDS = { minLat: 24, maxLat: 40.5, minLng: 43.5, maxLng: 64 };

export const inIran = ({ lat, lng }: LatLng) => lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;

/** ~10 cm precision is plenty. */
export const roundCoord = (n: number) => Math.round(n * 1e6) / 1e6;

/** Default view for the picker before a location is saved: Amir Kabir St., Tehran. */
export const DEFAULT_CENTER: LatLng = { lat: 35.69355, lng: 51.42585 };

/** Opens Neshan routing to the shop (the Neshan app opens it directly when installed). */
export const neshanRouteUrl = ({ lat, lng }: LatLng) => `https://neshan.org/maps/routing/car/destination/${lat},${lng}`;
export const googleMapsRouteUrl = ({ lat, lng }: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/**
 * Finds coordinates in pasted text: "35.69, 51.42", a Google Maps link (@lat,lng or q=lat,lng),
 * a Neshan link (…/lat,lng) and similar. Returns null when nothing sensible is found.
 */
export function parseLatLng(input: string): LatLng | null {
  const text = toEnDigits(input).replace(/٫/g, ".").replace(/،/g, ",");
  const re = /(-?\d{1,3}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})/g;
  for (const m of text.matchAll(re)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const candidates: LatLng[] = [{ lat: a, lng: b }, { lat: b, lng: a }];
    const hit = candidates.find(inIran);
    if (hit) return { lat: roundCoord(hit.lat), lng: roundCoord(hit.lng) };
  }
  return null;
}
