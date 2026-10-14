-- Seller cover photos (public, like shop covers) + personal seller plans (free | silver | gold)
ALTER TABLE "SellerProfile" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "planId" TEXT;
