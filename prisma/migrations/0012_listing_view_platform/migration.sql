-- Count product views separately for the website and native apps.
-- Existing rows were all recorded by browser clients, so they default to web.
ALTER TABLE "ListingView" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'web';

CREATE INDEX "ListingView_platform_createdAt_idx" ON "ListingView"("platform", "createdAt");
