-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "emailVerifyToken" TEXT;
ALTER TABLE "Customer" ADD COLUMN "emailVerifyExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_emailVerifyToken_key" ON "Customer"("emailVerifyToken");
