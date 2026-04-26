-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "fiscal_regime" INTEGER,
ADD COLUMN     "plugnotas_registered" BOOLEAN NOT NULL DEFAULT false;
