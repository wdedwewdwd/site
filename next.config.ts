import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Only local images are optimized; no remote hosts are allowed.
    remotePatterns: [],
    // Uploaded photos get a new random name whenever they change, so browsers can keep them for 30 days.
    minimumCacheTTL: 30 * 24 * 60 * 60,
  },
  experimental: {
    // Revisiting a page within 30 seconds (e.g. product → list → same product) is instant; any change made
    // through the site (cart, orders…) still refreshes immediately.
    staleTimes: { dynamic: 30 },
    // Room for two 4 MB images in one form (e.g. a banner with its phone version).
    serverActions: { bodySizeLimit: "9mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // No page may be shown inside another site, except the home page on eNamad's seal page (see ENAMAD_FRAME
      // in proxy.ts, which allows that one site through CSP; X-Frame-Options cannot name a site).
      { source: "/:path+", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
      // User uploads are never executable content.
      {
        source: "/media/:path*",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; img-src 'self'; sandbox" }],
      },
    ];
  },
};

export default nextConfig;
