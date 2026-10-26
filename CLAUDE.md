@AGENTS.md

# Arizon Yadak (آریزون یدک) — project notes

Iranian auto-parts e-commerce store. UI is Persian (RTL); talk to the owner in Persian. The owner is a
non-developer who wants decisions made for them and end-to-end delivery, verified before reporting.

## Stack
Next.js 16 (App Router, `src/proxy.ts` = middleware) · React 19 · Prisma 7 (PostgreSQL, `prisma-client`
generator → `src/generated/prisma`, driver adapter `@prisma/adapter-pg`) · Tailwind 4 (tokens in
`src/app/globals.css`) · Zod 4 · lucide-react. Design source: Figma file `BtALGM1STocoQz2tW07xcA`
(mobile, desktop and admin frames; Figma frames are LTR, so child order is reversed for RTL).

## Run locally
```bash
cp .env.example .env    # fill SESSION_SECRET, OTP_PEPPER; DATABASE_URL like postgres://arizon:<pw>@127.0.0.1:5433/arizon
npm run db:local        # embedded PostgreSQL (UTF-8 cluster in .localdb); keep running
npx prisma migrate deploy && npm run db:seed
npm run admin:set -- 09xxxxxxxxx   # creates an admin + fixed 4–6 digit login code (reads code from stdin)
npm run dev
```
The owner runs the site with `start-local.cmd` and updates with `update-site.cmd` (fast-forwards local `main`
from GitHub, then starts the site), so finished work must end up on `main`.
Dev login codes are printed as `[dev-sms]` (SMS_PROVIDER=console). Payments use the mock gateway in dev.
Checks before committing: `npx tsc --noEmit`, `npx eslint src scripts`, and for big changes a production
build (`APP_URL=https://example.com PAYMENT_PROVIDER=none ALLOW_CONSOLE_SMS=true npx next build`).

## Conventions and decisions
- Forms backed by a server action use `onSubmit={keepValuesOnSubmit(action)}` (`components/ui/keepValuesOnSubmit.ts`), never
  `<form action={…}>`: React resets an action form after every submit, so a server-side validation error used to wipe
  everything the person typed. Forms that should clear after success call `form.reset()` when the state is `ok`.
- DB pool: 20 connections, transactions wait up to 10 s for one (`src/lib/db.ts`); a 40-customer browser test
  (sign-in, cart, simultaneous checkout of the last units) passed with no errors and no overselling.
- Security first: every server action/route validates with Zod, re-checks auth (`requireUser` /
  `requireStaff` in `src/lib/auth/session.ts`), scopes queries by `userId`, rate-limits (`src/lib/rate-limit.ts`)
  and writes admin changes to the audit log. Prices always come from the DB. CSP with nonces in proxy.
  No page may be framed except the home page `/`, and only by `https://trustseal.enamad.ir`. eNamad's seal page shows the
  site in an iframe; with `X-Frame-Options: DENY` everywhere it showed an empty grey box, and Blu Bank refused the
  business account over «اینماد». See `ENAMAD_FRAME` in proxy.ts and the `/:path+` X-Frame-Options rule in next.config.ts.
- Auth: everyone signs in with an SMS code at `/login`. Staff accounts have a fixed 4–6 digit code
  (`User.passwordHash`, scrypt + OTP_PEPPER) typed in the same form instead of an SMS code; no SMS is sent to
  them and the form looks identical. New/changed staff codes must be 6 digits and not trivial (`staffCodeSchema`);
  older shorter codes still work but set `User.weakStaffCode`, which shows a «change your code» banner in the panel. The first admin on a new database is created with `npm run admin:set`; after that
  admins add/edit/remove staff (ADMIN or SUPPORT, phone + name + code) in Settings → «مدیران و پشتیبان‌ها»
  (`actions/admin/staff.ts`, re-enters the acting admin's own code). Removing access turns the person into a customer.
  Staff sign in again after 12 h: `requireStaff` deletes the session row and redirects to `/login?reauth=1`. It must not
  touch cookies, because pages may not change them; that threw and showed the error page on every panel visit (fixed 2026-10-26).
- Error page (`app/error.tsx`): «تلاش مجدد» calls `retry()` (asks the server again); `reset()` only redrew the failed page.
- Login SMS: the owner connects Faraz SMS / Iran Payamak at `/admin/sms` (menu «سامانه پیامک»): API key (stored sealed with
  AES-GCM, key derived from OTP_PEPPER in `src/lib/secret-box.ts`; never sent back to the page), pattern code, variable
  name (default `code`) and line number in Settings `sms_*` (`src/lib/sms-settings.ts`, kept out of `getSettings`). A test
  message must succeed with the exact settings (fingerprint in `sms_tested`) before «ورود با پیامک» can be switched on;
  any change switches it off. While on, `sendOtpSms` uses `src/lib/iranpayamak.ts` (POST /ws/v1/sms/pattern, header
  `Api-Key`); while off, the env provider (console/Kavenegar) is used. `IRANPAYAMAK_BASE_URL` exists only for local tests.
- Dates/times: Jalali calendar and Asia/Tehran everywhere (`src/lib/jalali.ts`, `src/lib/format.ts`).
- Product search: `src/lib/search.ts` (pure engine: Persian normalization, every word must match name/brand/
  category/cars/codes in any order, suffixes, Latin car names, typo only as a flagged fallback, relevance ranking)
  over an in-memory index rebuilt every 30 s (`src/lib/search-index.ts`). Used by `/search` (sort «مرتبط‌ترین»)
  and the header suggestions (`/api/search`, `components/layout/SearchBox.tsx`). Add car names to `SYNONYMS`/`KNOWN_WORDS`.
- Postal code is optional (staff call the customer); admin order pages flag missing ones.
- Orders: transitions and stock rules live in `src/lib/order-flow.ts`; actions in `src/app/actions/admin/orders.ts`.
  Admin list tab «نیاز به اقدام» (`status=todo`) = `NEEDS_ACTION` (PAID + PROCESSING, oldest first; also the menu badge).
  `Product.soldCount` follows `countsAsSold` (COD counts at checkout, online on payment; cancel/refund takes it back).
  `OrderEvent.actorId` = staff member who made the change (shown in the order history). Invoices share
  `components/admin/orders/InvoiceSheet.tsx`; ticked orders print together at `/admin/invoice/batch?n=..&n=..`.
- Payment is online only (owner's decision, 2026-10-13): cash on delivery was removed from checkout, the info pages and
  the FAQ (migration `20261013120000_online_payment_only`). While PAYMENT_PROVIDER=none the payment step explains that
  online payment is coming and disables «ثبت سفارش». `PaymentMethod.COD` and the admin COD tools stay only for old orders.
  Returns policy: return shipping both ways is paid by the customer in every case (`/returns`, `/terms`).
- Footer «دسته‌بندی‌های محبوب» links the main categories by slug (`FOOTER_CATEGORIES` in `SiteFooter.tsx`: engine,
  electrical, suspension); a hidden or missing one falls back to `/categories`.
- Shipping: methods POST, TIPAX, EXPRESS (پیک, Tehran-only by default), FREIGHT (باربری), PICKUP (تحویل حضوری, no address;
  the order stores the shop address). Owner edits title/description/price/on-off/order at `/admin/shipping` (Setting
  `shipping_config` JSON; defaults, schema and `quoteShipping` in `src/lib/shipping-shared.ts`, `getShippingConfig()`).
  Pricing: fixed (+ optional free-over amount), collect «پس‌کرایه» (`Order.shippingCollect`, cost 0) or free. Prices are
  always recomputed on the server in `placeOrder`.
- Admin product list (`/admin/products`): filters, tabs (فعال، ناموجود، بدون عکس…) and sorts live in `src/lib/admin-products.ts`;
  50 per page, default order is creation date so edits never reorder rows. Price/stock edit inline (`quickUpdateProduct`),
  ticked products are activated/deactivated/moved/deleted together (`bulkProducts`, deletes unused uploaded photos).
  Links to the edit page carry `?back=<list query>` so saving returns to the same filters and page (`?saved=` highlights it).
  «دریافت خروجی» (`ExportMenu`) exports the filtered list, all pages, in list order (photo, name, SKU, current price,
  empty «قیمت جدید»): Excel from `/api/admin/products/export` (hand-written XLSX in `src/lib/xlsx.ts` with fflate, no
  library; webp photos become JPEG thumbnails that move and size with their cell, so Excel sorting/filtering keeps them;
  checked by opening in real Excel) and PDF via the print page `/admin/print/products` (`?auto=1` opens the print
  dialog once photos load; named `@page price-list` in globals.css adds «صفحه x از y»; the owner picks «Save as PDF»).
  The filled-in file comes back at `/admin/products/prices` (menu item «بارگذاری قیمت‌های جدید»): `src/lib/xlsx-read.ts`
  reads the first sheet (Excel re-saves use shared strings), `planPriceImport` (`src/lib/price-import.ts`) finds the
  «کد کالا»/«قیمت جدید» columns by title, accepts Persian/Arabic digits and separators, skips empty cells and reports bad
  rows (not a number, < 1000, decimals, unknown or conflicting SKU, discounted product priced ≥ its struck price). Preview
  first; «اعمال» re-reads the same file and writes only if the change list's digest still matches and each price is
  unchanged (one transaction), then logs `product.price_import` with every from/to.
- Product prices: the form shows "قیمت اصلی" + a discount switch (percent or sale price, `ProductPriceFields`); the DB
  stores `price` (paid) and `compareAtPrice` (struck-through). Car models are one shared list edited from the product
  form ("مدیریت خودروها", `actions/admin/cars.ts`); renaming keeps the slug, deleting removes it from all products.
  Brands work the same way ("مدیریت برندها" next to the brand select, `BrandManager`, `actions/admin/brands.ts`): Persian name
  + optional Latin name, shown in the shop filter as «بوش (BOSCH)»; deleting a brand leaves its products without a brand.
- Visit statistics (`/admin/analytics`, menu «آمار بازدید»; dashboard card «بازدیدکنندگان امروز»): first-party, no third-party
  script. `components/analytics/VisitTracker.tsx` (root layout) posts each storefront page view and its visible time to
  `/api/visit` → `PageView` (`src/lib/visit-track.ts`: random visitor/session cookies, only their HMACs stored, no IPs;
  bots, cross-site posts, staff and `/admin` are skipped). Report queries in `src/lib/analytics.ts` reuse the sales
  report's Jalali buckets, `ReportShell`, `StatTile`, `BarList`, `HourPanel`. `PageView` is deliberately not in backups
  (it grows); housekeeping deletes rows older than 400 days.
- Backup/restore: `src/lib/backup-core.ts` (admin: Settings; CLI: `npm run backup:create|backup:restore`).
  New tables go in `TABLES` (and `OPTIONAL_TABLES` so older backups still restore).
- Live chat: `src/lib/chat.ts` (in-process event bus + DB polling fallback), SSE routes under `src/app/api/chat`
  and `src/app/api/admin/chat`, actions in `src/app/actions/chat.ts` / `actions/admin/chat.ts`. Customer widget
  `components/chat/ChatWidget.tsx` (open it anywhere with `openChat()` or `?chat=1`); admin inbox `/admin/chat`
  with one shared stream per admin tab (`StaffChatProvider`, also drives the menu badge and "support online").
  Guests chat with name + mobile via a random httpOnly cookie (only its HMAC is stored); chat photos are private
  (`/api/chat/media/*`, access-checked). Not designed in Figma (Figma MCP quota ran out); built in the site's style.
- Reviews: customers (signed in) rate 1–5 + text at the bottom of each product page (`ReviewsSection`/`ReviewForm`,
  `actions/reviews.ts`); one per customer per product, editing sends it back to moderation. Staff approve/hide/delete/reply
  at `/admin/reviews` (menu badge = pending). `Product.ratingAvg/ratingCount` come only from approved reviews
  (`refreshProductRating` in `src/lib/reviews.ts`; restore recomputes them). "خریدار این کالا" = paid order with the product.
- Home page categories start with the carmaker (`components/home/MakerPicker.tsx`): ایران خودرو / سایپا cards
  (logos in `public/brand/makers`), then that maker's categories with counts (`src/lib/home-makers.ts`); choice kept
  in `/?maker=`. Cars belong to a maker automatically by «سازنده»/model words (`carMaker` in `src/lib/makers.ts`).
  Listings accept `?maker=` = parts ticked for that maker's cars + general parts with no car ticked (chip to remove it).
- Home page order: banners, `FeatureStrip`, maker picker, `PopularParts` (subcategories with the most parts, round
  photos), «منتخب قطعات» (real best sellers once ≥ 4 have sold, else `getMixedPicks`: a daily-shuffled mix), then one
  sideways `ProductRail` per main category (`getCategoryRails`: one product per subcategory in turn), offers, `HelpCta`.
  Data in `src/lib/home-sections.ts`.
- Footer: logo before the name, one line per contact detail with an icon, directions buttons, social icons centred.
- Logo + shop name side by side always use `LogoLockup` (`components/brand/Logo.tsx`): header (desktop and phone),
  phone menu, footer, admin bar. The name sits on the baseline of the «ARIZON» lettering, 96% down the logo. Centred on
  the whole logo it floated between the emblem and the lettering. The lockup's box equals the logo's box, so it still
  centres in a bar.
- Routing buttons (footer, support menu, contact page, about page) show the apps' real marks: `NeshanIcon` and
  `GoogleMapsIcon` in `components/icons/MapApps.tsx`. Their paths are copied unchanged from neshan.org's logo and the
  2020 Google Maps icon.
- Homepage banners: `/admin/banners` (`src/lib/banners*.ts`, `components/home/HeroBanners.tsx`). Layouts: single,
  split (big + small), grid4, slider; active banners fill the layout's places in list order. Built with container
  queries (`@container/hero`) so the admin preview renders the phone and desktop versions exactly.
- Floating "پشتیبانی" button (`ChatWidget`): menu of call, live chat, WhatsApp, Telegram, Bale (بله), Rubika (روبیکا),
  Instagram and «مسیریابی» (Neshan / Google Maps buttons), in `SUPPORT_CHANNELS` order, each switchable at /admin/contact
  and hidden while its ID/link is empty; built from `getContact()` in the shop layout. The panel scrolls inside
  (`.support-menu-panel` max height). Map links (`map_neshan`, `map_google`: pasted share links, host-checked in
  `contact-shared.ts`; share text around the link is fine) fall back to routing to the Settings map pin (`getContact`);
  they show in the footer, on the contact page and in the menu.
- Shop location: Settings → map picker (Leaflet + OpenStreetMap tiles, keys `shop_lat`/`shop_lng`); the contact page
  shows it and links to Neshan routing (`src/lib/location.ts`).
- Category icons: names stored in `Category.icon`, whitelist + Persian labels in `src/lib/shop.ts`, renderers in
  `components/ui/CategoryIcon.tsx`. Auto-part icons (spark-plug, shock-absorber, engine, brake-disc, gearbox) are drawn
  on Lucide's grid in `components/ui/part-icons.ts` (`createLucideIcon`).
- Inner pages use `PageBar` (mobile app bar with back button, desktop breadcrumbs + back).
- About page (`(shop)/about/page.tsx`) is built by hand, not with `ContentPage`: dark hero with the logo emblem
  (`public/brand/emblem.webp`, cut from `logo.svg`) as a watermark, figures, story, «چرا آریزون یدک؟» cards, contact card.
  Copy follows the owner: 20+ years in the Tehran market (Amirkabir St.), direct importer of the «آریزون» brand, first-hand
  parts, and «آریزون یدک ۷ روز ضمانت بازگشت کالا می‌دهد» (the legal wording stays on `/returns` and `/terms`).
  Logos always sit before (to the right of) the name: header (phone and desktop), footer, about page.
- The body font uses Vazirmatn `ss01`, which draws every digit in Persian; e-mail links and e-mail fields reset it in
  globals.css so addresses show their real digits.
- Older iPhones: `browserslist` in package.json (Safari/iOS 14+). Next 16 targets Safari 16.4 by default and emitted class
  static blocks, so on iOS 15 (iPhone 6s/7) no page hydrated and no button worked (2026-10-20). Check changes that touch
  the build with an iOS-15-era WebKit (playwright-core 1.20 `webkit`) against a production build; avoid APIs newer than
  iOS 15 in client code (e.g. `form.requestSubmit()`, which needs iOS 16).
- Sign-up = SMS code + name: a customer without first/last name is sent to `/welcome` (route group `(onboarding)`, form
  `components/auth/WelcomeForm.tsx`, saves through `updateAccount`). Routing only: cookie `ay_complete_profile`
  (`lib/auth/profile-gate.ts`, set at login, cleared when the name is saved or on logout) makes the proxy send page loads
  to `/welcome?next=…` (not /terms, /privacy, /login, /admin, files or actions); `/api/auth/profile-gate` drops a stale one.
- Phones: form fields are 16px on phones (iOS zooms into smaller fields; unlayered rule in globals.css); the bottom nav
  is `h-16` + safe area; an element with `data-mobile-buybar` (product page buy bar, cart total bar) lifts the support
  button (`.support-fab`) and toasts (`.toaster-stack`) above it via `body:has()`; sideways rows use the `no-scrollbar`
  utility; page grids use `grid-cols-[minmax(0,1fr)…]` so a wide scrolling row can't stretch the page. The phone header
  has the account button (initial of the name, red dot for unread notifications) instead of the notifications bell; the
  profile home page shows the account card and profile menu at the top on phones.
- Site icons (tab, iPhone home screen, Android) come from the logo emblem: `src/app/favicon.ico`, `icon.png`,
  `apple-icon.png`, `manifest.ts` + `public/icons/`.
- Every admin page has a `HelpBox` explaining it in plain Persian; keep adding one for new pages.
- Migrations: `prisma migrate dev` can fail on the shadow DB; writing the SQL by hand in
  `prisma/migrations/<timestamp>_<name>/migration.sql` and running `prisma migrate deploy` works.
- When testing with data, create clearly tagged throwaway rows and delete them afterwards.

## Hosting
Live at https://arizonyadak.ir on a ParsPack cloud server in Tehran (Ubuntu 24.04, IP 45.149.77.216): Nginx →
`next start` (systemd `arizon`) → local PostgreSQL 16. Layout, commands, domain/DNS and rebuild steps:
`deploy/server/README.md`. SSH as root with the key `~/.ssh/arizon_server` (alias `arizon`, key-only). Deploy =
`ssh arizon arizon-deploy` (the owner double-clicks `update-server.cmd`), so merged work on `main` still has to be
deployed. DNS and email stay on the owner's MihanWebHost cPanel hosting (the old WordPress site is there too).
eNamad is already issued for arizonyadak.ir (id 698970). Until Kavenegar/Zarinpal are set up the server runs
SMS_PROVIDER=console + ALLOW_CONSOLE_SMS (customer codes only in `journalctl -u arizon`) and PAYMENT_PROVIDER=none.
`liara.json`/`railway.json` are from earlier hosting attempts.

## Not built yet (from the Figma design)
Wallet payment, admin "reports" page beyond the dashboard report, map picker for customer addresses,
profile photo. Phones, hours, address, postal code, email and social links are edited by the owner at
`/admin/contact` (Settings keys `contact_*`/`social_*`, defaults and parsing in `src/lib/contact-shared.ts`, read
with `getContact()`); `SITE` in `src/lib/shop.ts` only holds the brand name/description. Postal code and email are
still empty and must be filled in before applying for eNamad; support hours unconfirmed.
