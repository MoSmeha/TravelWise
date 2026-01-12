/*
  Warnings:

  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/

-- First, delete users with NULL email (or you could update them with a placeholder)
-- Since we're in development, deleting is fine
DELETE FROM "User" WHERE "email" IS NULL;

-- DropIndex
DROP INDEX IF EXISTS "User_phone_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "phone",
ALTER COLUMN "email" SET NOT NULL;
