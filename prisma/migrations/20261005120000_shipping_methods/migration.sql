-- AlterEnum
ALTER TYPE "ShippingMethod" ADD VALUE 'TIPAX';
ALTER TYPE "ShippingMethod" ADD VALUE 'FREIGHT';
ALTER TYPE "ShippingMethod" ADD VALUE 'PICKUP';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shippingCollect" BOOLEAN NOT NULL DEFAULT false;
