-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "mobileImage" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "badge" TEXT,
    "buttonLabel" TEXT,
    "href" TEXT,
    "showText" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Banner_isActive_sortOrder_idx" ON "Banner"("isActive", "sortOrder");


-- Keep the homepage exactly as it was: the two banners that used to be built into the page.
INSERT INTO "Banner" ("id", "image", "title", "subtitle", "badge", "buttonLabel", "href", "isActive", "sortOrder", "updatedAt") VALUES
  ('bannerseedhero0000000001', '/banners/hero-brakes.jpg', 'تا ۳۰٪ تخفیف روی دیسک و لنت ترمز', 'تضمین اصالت و سلامت فیزیکی قطعات به همراه فاکتور معتبر', 'تخفیف ویژه پاییزه', 'مشاهده و خرید قطعات', '/offers', true, 0, CURRENT_TIMESTAMP),
  ('bannerseedside0000000001', '/banners/side-spark-plugs.jpg', 'شمع‌های سوزنی ان‌جی‌کا', 'کاهش چشمگیر مصرف سوخت و شتاب برتر خودروی شما', NULL, 'خرید شمع', '/search?q=شمع', true, 1, CURRENT_TIMESTAMP);

INSERT INTO "Setting" ("key", "value") VALUES ('hero_layout', 'split') ON CONFLICT ("key") DO NOTHING;
