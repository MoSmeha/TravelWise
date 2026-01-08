-- CreateEnum
CREATE TYPE "ChecklistCategory" AS ENUM ('ESSENTIALS', 'WEATHER', 'TERRAIN', 'ACTIVITY', 'SAFETY', 'DOCUMENTATION');

-- CreateEnum
CREATE TYPE "ChunkType" AS ENUM ('FULL_SUMMARY', 'DAY_PLAN', 'PLACE_DETAIL', 'CHECKLIST', 'ROUTE_OVERVIEW');

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classification" "LocationClassification" NOT NULL,
    "category" "LocationCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "sources" TEXT[],
    "sourceUrls" TEXT[],
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "googlePlaceId" TEXT,
    "rating" DOUBLE PRECISION,
    "totalRatings" INTEGER,
    "priceLevel" INTEGER,
    "openingHours" JSONB,
    "topReviews" JSONB,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Lebanon',
    "costMinUSD" DOUBLE PRECISION,
    "costMaxUSD" DOUBLE PRECISION,
    "activityTypes" TEXT[],
    "bestTimeToVisit" TEXT,
    "localTip" TEXT,
    "scamWarning" TEXT,
    "lastEnrichedAt" TIMESTAMP(3),
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItinerary" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "country" TEXT NOT NULL,
    "airportCode" TEXT NOT NULL,
    "numberOfDays" INTEGER NOT NULL,
    "budgetUSD" DOUBLE PRECISION NOT NULL,
    "travelStyles" TEXT[],
    "flightDate" TIMESTAMP(3),
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "totalEstimatedCostUSD" DOUBLE PRECISION,
    "routeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserItinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryItem" (
    "id" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "orderInDay" INTEGER NOT NULL,
    "suggestedStartTime" TEXT,
    "suggestedDuration" INTEGER,
    "travelTimeFromPrev" INTEGER,
    "notes" TEXT,
    "itineraryId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "category" "ChecklistCategory" NOT NULL,
    "item" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "itineraryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryEmbedding" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkType" "ChunkType" NOT NULL,
    "chunkText" TEXT NOT NULL,
    "placeIds" TEXT[],
    "dayNumbers" INTEGER[],
    "activityTypes" TEXT[],
    "embeddingJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_googlePlaceId_key" ON "Place"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Place_classification_idx" ON "Place"("classification");

-- CreateIndex
CREATE INDEX "Place_city_idx" ON "Place"("city");

-- CreateIndex
CREATE INDEX "Place_googlePlaceId_idx" ON "Place"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Place_country_idx" ON "Place"("country");

-- CreateIndex
CREATE INDEX "UserItinerary_userId_idx" ON "UserItinerary"("userId");

-- CreateIndex
CREATE INDEX "UserItinerary_flightDate_idx" ON "UserItinerary"("flightDate");

-- CreateIndex
CREATE INDEX "UserItinerary_country_idx" ON "UserItinerary"("country");

-- CreateIndex
CREATE INDEX "ItineraryItem_itineraryId_idx" ON "ItineraryItem"("itineraryId");

-- CreateIndex
CREATE INDEX "ItineraryItem_placeId_idx" ON "ItineraryItem"("placeId");

-- CreateIndex
CREATE INDEX "ChecklistItem_itineraryId_idx" ON "ChecklistItem"("itineraryId");

-- CreateIndex
CREATE INDEX "ChecklistItem_category_idx" ON "ChecklistItem"("category");

-- CreateIndex
CREATE INDEX "ItineraryEmbedding_itineraryId_idx" ON "ItineraryEmbedding"("itineraryId");

-- CreateIndex
CREATE INDEX "ItineraryEmbedding_chunkType_idx" ON "ItineraryEmbedding"("chunkType");

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryEmbedding" ADD CONSTRAINT "ItineraryEmbedding_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
