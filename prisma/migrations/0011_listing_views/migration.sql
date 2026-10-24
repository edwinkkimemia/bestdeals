-- Product-view analytics (ListingView was added to schema.prisma but had no
-- migration, so every write/read silently fell back to per-process memory).
CREATE TABLE "ListingView" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "viewerId" TEXT,
    "sessionId" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingView_listingId_createdAt_idx" ON "ListingView"("listingId", "createdAt");
CREATE INDEX "ListingView_createdAt_idx" ON "ListingView"("createdAt");
