/*
  Warnings:

  - The `priceLevel` column on the `Place` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `City` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Country` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Itinerary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItineraryDay` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Warning` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ItineraryDayToLocation` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[itineraryId,dayNumber,orderInDay]` on the table `ItineraryItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `KnowledgeEmbedding` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PriceLevel" AS ENUM ('INEXPENSIVE', 'MODERATE', 'EXPENSIVE');

-- AlterEnum
ALTER TYPE "LocationClassification" ADD VALUE 'MUST_SEE';

-- DropForeignKey
ALTER TABLE "City" DROP CONSTRAINT "City_countryId_fkey";

-- DropForeignKey
ALTER TABLE "Itinerary" DROP CONSTRAINT "Itinerary_cityId_fkey";

-- DropForeignKey
ALTER TABLE "ItineraryDay" DROP CONSTRAINT "ItineraryDay_itineraryId_fkey";

-- DropForeignKey
ALTER TABLE "ItineraryItem" DROP CONSTRAINT "ItineraryItem_placeId_fkey";

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_cityId_fkey";

-- DropForeignKey
ALTER TABLE "Warning" DROP CONSTRAINT "Warning_countryId_fkey";

-- DropForeignKey
ALTER TABLE "_ItineraryDayToLocation" DROP CONSTRAINT "_ItineraryDayToLocation_A_fkey";

-- DropForeignKey
ALTER TABLE "_ItineraryDayToLocation" DROP CONSTRAINT "_ItineraryDayToLocation_B_fkey";

-- AlterTable
ALTER TABLE "KnowledgeEmbedding" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "priceLevel",
ADD COLUMN     "priceLevel" "PriceLevel";

-- DropTable
DROP TABLE "City";

-- DropTable
DROP TABLE "Country";

-- DropTable
DROP TABLE "Itinerary";

-- DropTable
DROP TABLE "ItineraryDay";

-- DropTable
DROP TABLE "Location";

-- DropTable
DROP TABLE "Warning";

-- DropTable
DROP TABLE "_ItineraryDayToLocation";

-- DropEnum
DROP TYPE "BudgetLevel";

-- DropEnum
DROP TYPE "CrowdLevel";

-- DropEnum
DROP TYPE "TravelStyle";

-- CreateIndex
CREATE INDEX "ItineraryItem_itineraryId_dayNumber_orderInDay_idx" ON "ItineraryItem"("itineraryId", "dayNumber", "orderInDay");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryItem_itineraryId_dayNumber_orderInDay_key" ON "ItineraryItem"("itineraryId", "dayNumber", "orderInDay");

-- CreateIndex
CREATE INDEX "Place_city_classification_idx" ON "Place"("city", "classification");

-- CreateIndex
CREATE INDEX "Place_country_category_idx" ON "Place"("country", "category");

-- AddForeignKey
ALTER TABLE "UserItinerary" ADD CONSTRAINT "UserItinerary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
