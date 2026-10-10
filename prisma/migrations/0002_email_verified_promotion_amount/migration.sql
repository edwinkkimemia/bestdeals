-- Add email verification flag + promotion amount
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Promotion" ADD COLUMN "amount" INTEGER NOT NULL DEFAULT 0;
