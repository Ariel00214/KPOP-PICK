ALTER TABLE "Album" ADD COLUMN "appleMusicId" TEXT;
ALTER TABLE "Album" ADD COLUMN "albumType" TEXT;
ALTER TABLE "Album" ADD COLUMN "trackCount" INTEGER;
ALTER TABLE "Album" ADD COLUMN "hanteoVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Album" ADD COLUMN "hanteoSourceUrl" TEXT;
CREATE UNIQUE INDEX "Album_appleMusicId_key" ON "Album"("appleMusicId");
