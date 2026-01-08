-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "imageUrls" TEXT[],
ADD COLUMN     "sourceReviews" JSONB;
