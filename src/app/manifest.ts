import type { MetadataRoute } from "next";
import { SITE } from "@/lib/shop";

/** «Add to home screen» on Android: name, colours and the Arizon icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} | فروشگاه آنلاین قطعات یدکی خودرو`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "fa",
    background_color: "#f8f9fa",
    theme_color: "#191919",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
