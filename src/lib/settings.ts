import "server-only";
import { cache } from "react";
import { db } from "./db";

export const SETTING_KEYS = ["enamad_id", "enamad_code", "announcement"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const getSettings = cache(async () => {
  const rows = await db.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Record<SettingKey, string>>;
});
