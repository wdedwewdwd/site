import { Battery, CircleDot, Cog, Disc, Droplet, Lightbulb, Settings, Wind, Wrench, CarFront, type LucideIcon } from "lucide-react";

// Whitelist of icons an admin may assign to a category (stored by name in the DB).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  wind: Wind,
  droplet: Droplet,
  battery: Battery,
  disc: Disc,
  "circle-dot": CircleDot,
  settings: Settings,
  cog: Cog,
  lightbulb: Lightbulb,
  wrench: Wrench,
  car: CarFront,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Wrench;
  return <Icon className={className} aria-hidden />;
}
