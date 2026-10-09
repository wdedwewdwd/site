import { createLucideIcon } from "lucide-react";

/**
 * Auto-part icons drawn on Lucide's 24px grid (2px round strokes) so they sit next to its icons.
 * Used as category icons; see CATEGORY_ICONS.
 */
export const SparkPlug = createLucideIcon("spark-plug", [
  ["path", { d: "M12 2v2", key: "sp1" }],
  ["path", { d: "M10.25 4h3.5l.75 5.5h-5z", key: "sp2" }],
  ["rect", { x: "7.5", y: "9.5", width: "9", height: "3.5", rx: "1", key: "sp3" }],
  ["path", { d: "M9.75 13v4.5h4.5V13", key: "sp4" }],
  ["path", { d: "M12 17.5V19", key: "sp5" }],
  ["path", { d: "M14.25 17.5V21.5H11.5", key: "sp6" }],
  ["path", { d: "M7.5 16.5 5.75 19h2.5L6.5 21.5", key: "sp7" }],
]);

export const ShockAbsorber = createLucideIcon("shock-absorber", [
  ["circle", { cx: "12", cy: "3", r: "1.5", key: "sa1" }],
  ["path", { d: "M12 4.5v2", key: "sa2" }],
  ["path", { d: "M6.5 6.5h11", key: "sa3" }],
  ["path", { d: "m8.5 8.5 7 2-7 2 7 2-7 2", key: "sa4" }],
  ["path", { d: "M6.5 18.5h11", key: "sa5" }],
  ["path", { d: "M10 18.5v3h4v-3", key: "sa6" }],
]);

export const Engine = createLucideIcon("engine", [
  ["path", { d: "M9 4.5h6", key: "en1" }],
  ["path", { d: "M12 4.5V8", key: "en2" }],
  ["path", { d: "M7.5 8H15l2 2h2V8.5h2.5V18H19v-2.5h-2V19H9.5l-2-2H5v-2.5H3V18H1.5v-8.5H3V12h2V10z", key: "en3" }],
  ["circle", { cx: "11.5", cy: "13.5", r: "2", key: "en4" }],
]);

export const BrakeDisc = createLucideIcon("brake-disc", [
  ["circle", { cx: "11", cy: "13", r: "8.5", key: "bd1" }],
  ["circle", { cx: "11", cy: "13", r: "2.5", key: "bd2" }],
  ["path", { d: "M11 8h.01", key: "bd3" }],
  ["path", { d: "M16 13h.01", key: "bd4" }],
  ["path", { d: "M11 18h.01", key: "bd5" }],
  ["path", { d: "M6 13h.01", key: "bd6" }],
  ["path", { d: "M14 2.5a10.5 10.5 0 0 1 7.5 7.5", key: "bd7" }],
]);

/** Gear-shift pattern, from Lucide Lab (ISC licence). */
export const Gearbox = createLucideIcon("gearbox", [
  ["path", { d: "M5 4v16", key: "10bc4i" }],
  ["path", { d: "M12 4v16", key: "1654pz" }],
  ["path", { d: "M19 4v8H5", key: "1jiz4h" }],
]);
