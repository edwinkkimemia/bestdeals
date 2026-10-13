-- Shop public contacts: website, email + social links (all optional, seller-managed)
ALTER TABLE "Shop" ADD COLUMN "website" TEXT;
ALTER TABLE "Shop" ADD COLUMN "email" TEXT;
ALTER TABLE "Shop" ADD COLUMN "socials" JSONB;
