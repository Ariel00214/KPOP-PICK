CREATE TYPE "ArtistAliasType" AS ENUM ('STAGE_NAME', 'REAL_NAME', 'CHINESE_NAME', 'KOREAN_NAME', 'ENGLISH_NAME', 'GROUP_RELATED', 'COMMON_ALIAS');
CREATE TYPE "ReleaseCandidateStatus" AS ENUM ('DISCOVERED', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW');

CREATE TABLE "ArtistAlias" (
  "id" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "language" TEXT,
  "aliasType" "ArtistAliasType" NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  CONSTRAINT "ArtistAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReleaseCandidate" (
  "id" TEXT NOT NULL,
  "artistName" TEXT NOT NULL,
  "artistAliases" TEXT NOT NULL DEFAULT '[]',
  "albumName" TEXT NOT NULL,
  "normalizedArtist" TEXT NOT NULL,
  "normalizedAlbum" TEXT NOT NULL,
  "releaseDate" TIMESTAMP(3) NOT NULL,
  "releaseType" TEXT NOT NULL,
  "preorderStarted" BOOLEAN,
  "sourceName" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourcePublishedAt" TIMESTAMP(3),
  "confidence" DOUBLE PRECISION NOT NULL,
  "evidence" TEXT NOT NULL DEFAULT '[]',
  "status" "ReleaseCandidateStatus" NOT NULL DEFAULT 'DISCOVERED',
  "conflictReason" TEXT,
  "verifiedAlbumId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReleaseCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtistAlias_artistId_normalizedAlias_key" ON "ArtistAlias"("artistId", "normalizedAlias");
CREATE INDEX "ArtistAlias_normalizedAlias_idx" ON "ArtistAlias"("normalizedAlias");
CREATE UNIQUE INDEX "ReleaseCandidate_normalizedArtist_normalizedAlbum_releaseDate_sourceUrl_key" ON "ReleaseCandidate"("normalizedArtist", "normalizedAlbum", "releaseDate", "sourceUrl");
CREATE INDEX "ReleaseCandidate_normalizedArtist_normalizedAlbum_idx" ON "ReleaseCandidate"("normalizedArtist", "normalizedAlbum");
CREATE INDEX "ReleaseCandidate_status_releaseDate_idx" ON "ReleaseCandidate"("status", "releaseDate");
ALTER TABLE "ArtistAlias" ADD CONSTRAINT "ArtistAlias_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
