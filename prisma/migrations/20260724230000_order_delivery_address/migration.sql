-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryLine1" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "deliveryLine2" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryCity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "deliveryState" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryLandmark" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryPhone" TEXT;

-- Drop defaults after backfill (new rows must supply address via API)
ALTER TABLE "Order" ALTER COLUMN "deliveryLine1" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "deliveryCity" DROP DEFAULT;
