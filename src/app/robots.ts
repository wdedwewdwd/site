import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/profile", "/checkout", "/cart", "/payment", "/login", "/search"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
