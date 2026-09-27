-- Shop replies and edit time on customer reviews.
ALTER TABLE "Review" ADD COLUMN "reply" TEXT;
ALTER TABLE "Review" ADD COLUMN "repliedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Review_productId_approved_createdAt_idx" ON "Review"("productId", "approved", "createdAt");
CREATE INDEX "Review_approved_createdAt_idx" ON "Review"("approved", "createdAt");

-- Product ratings now come only from approved customer reviews (the sample catalog had made-up numbers).
UPDATE "Product" SET "ratingAvg" = 0, "ratingCount" = 0;
UPDATE "Product" p
SET "ratingAvg" = s.avg, "ratingCount" = s.cnt
FROM (
  SELECT "productId", ROUND(AVG("rating")::numeric, 1)::float8 AS avg, COUNT(*)::int AS cnt
  FROM "Review" WHERE "approved" GROUP BY "productId"
) s
WHERE s."productId" = p."id";
