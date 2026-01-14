/*
  Migration: Add ItineraryDay table and migrate existing data
  
  Strategy:
  1. Create ItineraryDay table
  2. Add new columns as nullable to ItineraryItem
  3. Migrate existing data
  4. Make columns NOT NULL / drop old columns
  5. Add constraints
*/

-- CreateEnum
CREATE TYPE "ItineraryItemType" AS ENUM ('ACTIVITY', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'EVENING');

-- AlterEnum: Add HOTEL and ACCOMMODATION to LocationCategory
ALTER TYPE "LocationCategory" ADD VALUE IF NOT EXISTS 'HOTEL';
ALTER TYPE "LocationCategory" ADD VALUE IF NOT EXISTS 'ACCOMMODATION';

-- Step 1: Create ItineraryDay table
CREATE TABLE "ItineraryDay" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "theme" TEXT,
    "description" TEXT,
    "hotelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add new columns to ItineraryItem (nullable first)
ALTER TABLE "ItineraryItem" ADD COLUMN "dayId" TEXT;
ALTER TABLE "ItineraryItem" ADD COLUMN "itemType" "ItineraryItemType" NOT NULL DEFAULT 'ACTIVITY';

-- Step 3: Migrate existing data - Create ItineraryDay records from existing ItineraryItems
-- For each unique (itineraryId, dayNumber) combination, create an ItineraryDay
INSERT INTO "ItineraryDay" ("id", "itineraryId", "dayNumber", "theme", "description", "createdAt", "updatedAt")
SELECT 
    'day_' || "itineraryId" || '_' || "dayNumber",
    "itineraryId",
    "dayNumber",
    'Mixed',
    'Day ' || "dayNumber",
    NOW(),
    NOW()
FROM "ItineraryItem"
GROUP BY "itineraryId", "dayNumber";

-- Step 4: Update ItineraryItem to link to new ItineraryDay records
UPDATE "ItineraryItem" 
SET "dayId" = 'day_' || "itineraryId" || '_' || "dayNumber";

-- Step 5: Make dayId NOT NULL now that it's populated
ALTER TABLE "ItineraryItem" ALTER COLUMN "dayId" SET NOT NULL;

-- Step 6: Drop old foreign key constraint  
ALTER TABLE "ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_itineraryId_fkey";

-- Step 7: Drop old indexes
DROP INDEX IF EXISTS "ItineraryItem_itineraryId_dayNumber_orderInDay_idx";
DROP INDEX IF EXISTS "ItineraryItem_itineraryId_dayNumber_orderInDay_key";
DROP INDEX IF EXISTS "ItineraryItem_itineraryId_idx";

-- Step 8: Drop old columns
ALTER TABLE "ItineraryItem" DROP COLUMN "dayNumber";
ALTER TABLE "ItineraryItem" DROP COLUMN "itineraryId";

-- Step 9: Create indexes
CREATE INDEX "ItineraryDay_itineraryId_idx" ON "ItineraryDay"("itineraryId");
CREATE UNIQUE INDEX "ItineraryDay_itineraryId_dayNumber_key" ON "ItineraryDay"("itineraryId", "dayNumber");
CREATE INDEX "ItineraryItem_dayId_idx" ON "ItineraryItem"("dayId");
CREATE UNIQUE INDEX "ItineraryItem_dayId_orderInDay_key" ON "ItineraryItem"("dayId", "orderInDay");

-- Step 10: Add foreign key constraints
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_itineraryId_fkey" 
    FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_hotelId_fkey" 
    FOREIGN KEY ("hotelId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_dayId_fkey" 
    FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
