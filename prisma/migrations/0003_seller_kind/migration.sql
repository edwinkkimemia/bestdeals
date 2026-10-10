-- Track whether the seller registered as an individual or a business
ALTER TABLE "User" ADD COLUMN "sellerKind" TEXT NOT NULL DEFAULT 'individual';
