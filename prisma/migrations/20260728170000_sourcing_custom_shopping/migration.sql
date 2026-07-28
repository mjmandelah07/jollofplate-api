-- Custom shopping / house-stock sourcing (no online prices)

CREATE TYPE "SourcingRequestStatus" AS ENUM ('PENDING', 'CANCELLED', 'COMPLETED');

CREATE TABLE "SourcingItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "unitHint" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourcingRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "SourcingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryLine1" TEXT NOT NULL,
    "deliveryLine2" TEXT,
    "deliveryCity" TEXT NOT NULL,
    "deliveryState" TEXT,
    "deliveryLandmark" TEXT,
    "deliveryPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourcingRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sourcingItemId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SourcingItem_slug_key" ON "SourcingItem"("slug");
CREATE INDEX "SourcingItem_available_sortOrder_idx" ON "SourcingItem"("available", "sortOrder");
CREATE INDEX "SourcingItem_slug_idx" ON "SourcingItem"("slug");

CREATE UNIQUE INDEX "SourcingRequest_requestNumber_key" ON "SourcingRequest"("requestNumber");
CREATE INDEX "SourcingRequest_customerId_idx" ON "SourcingRequest"("customerId");
CREATE INDEX "SourcingRequest_status_idx" ON "SourcingRequest"("status");
CREATE INDEX "SourcingRequest_requestNumber_idx" ON "SourcingRequest"("requestNumber");

CREATE INDEX "SourcingRequestItem_requestId_idx" ON "SourcingRequestItem"("requestId");
CREATE INDEX "SourcingRequestItem_sourcingItemId_idx" ON "SourcingRequestItem"("sourcingItemId");

ALTER TABLE "SourcingRequest" ADD CONSTRAINT "SourcingRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourcingRequestItem" ADD CONSTRAINT "SourcingRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SourcingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourcingRequestItem" ADD CONSTRAINT "SourcingRequestItem_sourcingItemId_fkey" FOREIGN KEY ("sourcingItemId") REFERENCES "SourcingItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
