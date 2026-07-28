-- Terminal Africa shipping fields on settings + orders

ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupLine1" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupLine2" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupCity" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupState" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupZip" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupCountry" TEXT DEFAULT 'NG';
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupPhone" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupEmail" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupFirstName" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "pickupLastName" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCarrierName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingDeliveryTime" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "terminalRateId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "terminalPickupAddressId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "terminalDeliveryAddressId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "terminalParcelId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "terminalShipmentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingBookedAt" TIMESTAMP(3);
