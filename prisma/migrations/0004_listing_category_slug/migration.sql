-- Separate real subcategories from the catalogue slug:
-- existing rows reused `subcategory` for the category slug, so copy it over.
ALTER TABLE "Listing" ADD COLUMN "categorySlug" TEXT;
UPDATE "Listing" SET "categorySlug" = "subcategory" WHERE "subcategory" IS NOT NULL;
