-- CreateTable
CREATE TABLE "ItineraryWarning" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryTouristTrap" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryTouristTrap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryLocalTip" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryLocalTip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItineraryWarning_itineraryId_idx" ON "ItineraryWarning"("itineraryId");

-- CreateIndex
CREATE INDEX "ItineraryTouristTrap_itineraryId_idx" ON "ItineraryTouristTrap"("itineraryId");

-- CreateIndex
CREATE INDEX "ItineraryLocalTip_itineraryId_idx" ON "ItineraryLocalTip"("itineraryId");

-- AddForeignKey
ALTER TABLE "ItineraryWarning" ADD CONSTRAINT "ItineraryWarning_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryTouristTrap" ADD CONSTRAINT "ItineraryTouristTrap_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryLocalTip" ADD CONSTRAINT "ItineraryLocalTip_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "UserItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
