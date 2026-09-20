CREATE TABLE "OfficialSource" (
  "id" TEXT NOT NULL,
  "artistId" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastScannedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfficialSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfficialSource_sourceUrl_key" ON "OfficialSource"("sourceUrl");
CREATE INDEX "OfficialSource_active_lastScannedAt_idx" ON "OfficialSource"("active", "lastScannedAt");
ALTER TABLE "OfficialSource" ADD CONSTRAINT "OfficialSource_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Submission" ADD COLUMN "verificationError" TEXT;
ALTER TABLE "ReleaseCandidate" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "ReleaseCandidate" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'NIGHTLY_SCAN';
ALTER TABLE "ReleaseCandidate" ADD COLUMN "missingFields" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ReleaseCandidate" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "ReleaseCandidate" ADD COLUMN "submissionId" TEXT;
ALTER TABLE "ReleaseCandidate" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "ReleaseCandidate" ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE TABLE "ReleaseEvidence" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "originalExcerpt" TEXT,
  "sourcePublishedAt" TIMESTAMP(3),
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isOfficial" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ReleaseEvidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReleaseEvidence_candidateId_sourceUrl_key" ON "ReleaseEvidence"("candidateId", "sourceUrl");
CREATE INDEX "ReleaseEvidence_candidateId_isOfficial_idx" ON "ReleaseEvidence"("candidateId", "isOfficial");
ALTER TABLE "ReleaseEvidence" ADD CONSTRAINT "ReleaseEvidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ReleaseCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
