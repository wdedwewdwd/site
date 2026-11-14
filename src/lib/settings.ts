import "server-only";
import { cache } from "react";
import { db } from "./db";
import { googleMapsRouteUrl, neshanRouteUrl, type LatLng } from "./location";
import { CONTACT_KEYS, resolveContact } from "./contact-shared";
import { parseShippingConfig } from "./shipping-shared";
import type { Prisma } from "@/generated/prisma/client";

export const SETTING_KEYS = [
  "enamad_id",
  "enamad_code",
  "announcement",
  "shop_lat",
  "shop_lng",
  "hero_layout",
  "hero_autoplay",
  // Shipping methods: titles, prices and switches as JSON (defaults and parsing in shipping-shared.ts).
  "shipping_config",
  // Contact details and social links (defaults and parsing in contact-shared.ts).
  ...CONTACT_KEYS,
  // "1" while «پنهان کردن کالاهای ناموجود» is on (admin product list).
  "hide_out_of_stock",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const getSettings = cache(async () => {
  const rows = await db.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Record<SettingKey, string>>;
});

/**
 * «پنهان کردن کالاهای ناموجود»: while on, products with no stock are left out of the shop everywhere. Products are not
 * changed, so each one comes back by itself as soon as it is in stock again.
 */
export const hideOutOfStock = async () => (await getSettings()).hide_out_of_stock === "1";

/** The products customers may see: active ones, and only those in stock while out-of-stock ones are hidden. */
export async function shopProductWhere(): Promise<Prisma.ProductWhereInput> {
  return (await hideOutOfStock()) ? { isActive: true, stock: { gt: 0 } } : { isActive: true };
}

/** Shop location on the map, set by the admin in Settings (null until set). */
export async function getShopLocation(): Promise<LatLng | null> {
  const s = await getSettings();
  const lat = Number(s.shop_lat);
  const lng = Number(s.shop_lng);
  return s.shop_lat && s.shop_lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Shop phone numbers, address, hours and social links, as edited in the admin panel. Directions use the Neshan /
 * Google Maps links pasted there, else routing to the map pin set in Settings.
 */
export const getContact = cache(async () => {
  const contact = resolveContact(await getSettings());
  const pin = await getShopLocation();
  return {
    ...contact,
    neshanUrl: contact.neshanUrl ?? (pin ? neshanRouteUrl(pin) : null),
    googleMapsUrl: contact.googleMapsUrl ?? (pin ? googleMapsRouteUrl(pin) : null),
  };
});

/** Shipping methods as configured at /admin/shipping (defaults until the owner saves them). */
export const getShippingConfig = cache(async () => parseShippingConfig((await getSettings()).shipping_config));
