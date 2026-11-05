-- DropForeignKey
ALTER TABLE "families" DROP CONSTRAINT "families_ownerId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rut" TEXT;

-- AlterTable
ALTER TABLE "families" ADD COLUMN     "importKey" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
ALTER COLUMN "ownerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "family_members" ADD COLUMN     "course" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "exAlumno" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rut" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_rut_key" ON "users"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "families_importKey_key" ON "families"("importKey");

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
