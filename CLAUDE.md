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
- Security first: every server action/route validates with Zod, re-checks auth (`requireUser` /
  `requireStaff` in `src/lib/auth/session.ts`), scopes queries by `userId`, rate-limits (`src/lib/rate-limit.ts`)
  and writes admin changes to the audit log. Prices always come from the DB. CSP with nonces in proxy.
- Auth: everyone signs in with an SMS code at `/login`. Staff accounts have a fixed 4–6 digit code
  (`User.passwordHash`, scrypt + OTP_PEPPER) typed in the same form instead of an SMS code; no SMS is sent to
  them and the form looks identical. The first admin on a new database is created with `npm run admin:set`; after that
  admins add/edit/remove staff (ADMIN or SUPPORT, phone + name + code) in Settings → «مدیران و پشتیبان‌ها»
  (`actions/admin/staff.ts`, re-enters the acting admin's own code). Removing access turns the person into a customer.
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
- Shipping: methods POST, TIPAX, EXPRESS (پیک, Tehran-only by default), FREIGHT (باربری), PICKUP (تحویل حضوری, no address;
  the order stores the shop address). Owner edits title/description/price/on-off/order at `/admin/shipping` (Setting
  `shipping_config` JSON; defaults, schema and `quoteShipping` in `src/lib/shipping-shared.ts`, `getShippingConfig()`).
  Pricing: fixed (+ optional free-over amount), collect «پس‌کرایه» (`Order.shippingCollect`, cost 0) or free. Prices are
  always recomputed on the server in `placeOrder`.
- Product prices: the form shows "قیمت اصلی" + a discount switch (percent or sale price, `ProductPriceFields`); the DB
  stores `price` (paid) and `compareAtPrice` (struck-through). Car models are one shared list edited from the product
  form ("مدیریت خودروها", `actions/admin/cars.ts`); renaming keeps the slug, deleting removes it from all products.
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
- Homepage banners: `/admin/banners` (`src/lib/banners*.ts`, `components/home/HeroBanners.tsx`). Layouts: single,
  split (big + small), grid4, slider; active banners fill the layout's places in list order. Built with container
  queries (`@container/hero`) so the admin preview renders the phone and desktop versions exactly.
- Floating "پشتیبانی" button (`ChatWidget`): menu of call, live chat, Instagram, WhatsApp (in that order; empty
  channels hidden), built from `getContact()` in the shop layout.
- Shop location: Settings → map picker (Leaflet + OpenStreetMap tiles, keys `shop_lat`/`shop_lng`); the contact page
  shows it and links to Neshan routing (`src/lib/location.ts`).
- Inner pages use `PageBar` (mobile app bar with back button, desktop breadcrumbs + back).
- Every admin page has a `HelpBox` explaining it in plain Persian; keep adding one for new pages.
- Migrations: `prisma migrate dev` can fail on the shadow DB; writing the SQL by hand in
  `prisma/migrations/<timestamp>_<name>/migration.sql` and running `prisma migrate deploy` works.
- When testing with data, create clearly tagged throwaway rows and delete them afterwards.

## Hosting
Target is Liara (Iranian PaaS; payment gateways need an Iranian server): `liara.json` + `liara_pre_start.sh`
(runs migrations). Production env: SMS_PROVIDER=kavenegar, PAYMENT_PROVIDER=zarinpal (or `none` = COD only),
UPLOAD_DIR on a persistent disk. Not deployed yet (Liara account needed identity verification and credit).

## Not built yet (from the Figma design)
Wallet payment, admin "reports" page beyond the dashboard report, map picker for customer addresses,
profile photo. Phones, hours, address, postal code, email and social links are edited by the owner at
`/admin/contact` (Settings keys `contact_*`/`social_*`, defaults and parsing in `src/lib/contact-shared.ts`, read
with `getContact()`); `SITE` in `src/lib/shop.ts` only holds the brand name/description. Postal code and email are
still empty and must be filled in before applying for eNamad; support hours unconfirmed.
