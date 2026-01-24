-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('OWNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ITINERARY_SHARED';
ALTER TYPE "NotificationType" ADD VALUE 'ITINERARY_ACCEPTED';

-- CreateTable
CREATE TABLE "ItineraryShare" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "SharePermission" NOT NULL DEFAULT 'VIEWER',
    "status" "ShareStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItineraryShare_userId_idx" ON "ItineraryShare"("userId");

-- CreateIndex
CREATE INDEX "ItineraryShare_itineraryId_idx" ON "ItineraryShare"("itineraryId");

-- CreateIndex
CREATE INDEX "ItineraryShare_status_idx" ON "ItineraryShare"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryShare_itineraryId_userId_key" ON "ItineraryShare"("itineraryId", "userId");

-- CreateIndex
CREATE INDEX "UserLocation_itineraryId_idx" ON "UserLocation"("itineraryId");

-- CreateIndex
CREATE INDEX "UserLocation_userId_idx" ON "UserLocation"("userId");

-- CreateIndex
CREATE INDEX "UserLocation_lastUpdatedAt_idx" ON "UserLocation"("lastUpdatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserLocation_userId_itineraryId_key" ON "UserLocation"("userId", "itineraryId");

-- AddForeignKey
ALTER TABLE "ItineraryShare" ADD CONSTRAINT "ItineraryShare_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryShare" ADD CONSTRAINT "ItineraryShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryShare" ADD CONSTRAINT "ItineraryShare_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
