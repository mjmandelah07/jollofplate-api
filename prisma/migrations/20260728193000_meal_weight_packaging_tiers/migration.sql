-- Meal shipping weight + Terminal packaging tiers

ALTER TABLE "Meal" ADD COLUMN IF NOT EXISTS "weightKg" DOUBLE PRECISION;

ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "terminalPackagingIdLight" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "terminalPackagingIdStandard" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "terminalPackagingIdLarge" TEXT;
