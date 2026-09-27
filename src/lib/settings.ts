import "server-only";
import { cache } from "react";
import { db } from "./db";
import type { LatLng } from "./location";

export const SETTING_KEYS = ["enamad_id", "enamad_code", "announcement", "shop_lat", "shop_lng"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const getSettings = cache(async () => {
  const rows = await db.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Record<SettingKey, string>>;
});

/** Shop location on the map, set by the admin in Settings (null until set). */
export async function getShopLocation(): Promise<LatLng | null> {
  const s = await getSettings();
  const lat = Number(s.shop_lat);
  const lng = Number(s.shop_lng);
  return s.shop_lat && s.shop_lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
