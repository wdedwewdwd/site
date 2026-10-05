import { Bike, Mail, Package, Store, Truck, type LucideIcon } from "lucide-react";
import type { ShippingMethod } from "@/generated/prisma/client";

/** One icon per shipping method, shared by checkout and the admin page. */
export const SHIPPING_ICONS: Record<ShippingMethod, LucideIcon> = { POST: Mail, TIPAX: Package, EXPRESS: Bike, FREIGHT: Truck, PICKUP: Store };
