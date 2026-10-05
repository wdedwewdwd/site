import { Battery, CircleDot, Cog, Disc, Droplet, Lightbulb, Settings, Wind, Wrench, CarFront, type LucideIcon } from "lucide-react";
import { BrakeDisc, Engine, Gearbox, ShockAbsorber, SparkPlug } from "./part-icons";

// Whitelist of icons an admin may assign to a category (stored by name in the DB).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "spark-plug": SparkPlug,
  "shock-absorber": ShockAbsorber,
  engine: Engine,
  gearbox: Gearbox,
  "brake-disc": BrakeDisc,
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
