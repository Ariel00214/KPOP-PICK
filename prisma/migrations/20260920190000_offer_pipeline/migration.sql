ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'PENDING_EXCEPTION';
ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'IGNORED';

ALTER TABLE "Album" ADD COLUMN "sourceName" TEXT;
ALTER TABLE "Album" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Album" ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Source" ADD COLUMN "trustLevel" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Source" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PurchaseOffer" ADD COLUMN "fingerprint" TEXT;
ALTER TABLE "PurchaseOffer" ADD COLUMN "evidence" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "PurchaseOffer" ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "PurchaseOffer" SET "fingerprint" = md5("albumVersionId" || ':' || "channelId" || ':' || COALESCE("purchaseUrl", "id"));
ALTER TABLE "PurchaseOffer" ALTER COLUMN "fingerprint" SET NOT NULL;
CREATE UNIQUE INDEX "PurchaseOffer_fingerprint_key" ON "PurchaseOffer"("fingerprint");

CREATE TABLE "OfferException" (
  "id" TEXT NOT NULL,
  "offerId" TEXT,
  "reason" TEXT NOT NULL,
  "rawPayload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfferException_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfferException_offerId_key" ON "OfferException"("offerId");
CREATE INDEX "OfferException_status_createdAt_idx" ON "OfferException"("status", "createdAt");
ALTER TABLE "OfferException" ADD CONSTRAINT "OfferException_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PurchaseOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
