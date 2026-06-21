/*
  Warnings:

  - You are about to drop the column `default_cofins_cst` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `default_icms_csosn` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `default_icms_cst` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `default_icms_origem` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `default_pis_cst` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `fiscal_regime` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `plugnotas_registered` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the `invoices` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_company_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_service_order_id_fkey";

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "default_cofins_cst",
DROP COLUMN "default_icms_csosn",
DROP COLUMN "default_icms_cst",
DROP COLUMN "default_icms_origem",
DROP COLUMN "default_pis_cst",
DROP COLUMN "fiscal_regime",
DROP COLUMN "plugnotas_registered";

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "labor_invoice_issued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parts_invoice_issued" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "invoices";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "InvoiceType";
