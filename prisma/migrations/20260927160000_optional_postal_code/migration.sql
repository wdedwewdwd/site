-- Postal code is optional; staff call the customer when it is missing
ALTER TABLE "Address" ALTER COLUMN "postalCode" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "postalCode" DROP NOT NULL;
