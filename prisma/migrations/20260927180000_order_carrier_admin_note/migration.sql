-- Shipping carrier and internal staff note on orders
ALTER TABLE "Order" ADD COLUMN "carrier" TEXT;
ALTER TABLE "Order" ADD COLUMN "adminNote" TEXT;
