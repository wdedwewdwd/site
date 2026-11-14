-- Stock is now only «موجود» / «ناموجود» (IN_STOCK in src/lib/shop.ts): every product that has stock gets the
-- «موجود» amount, so a product that showed «۱۲ عدد» does not run out by itself after 12 sales.
UPDATE "Product" SET "stock" = 100000 WHERE "stock" > 0;
