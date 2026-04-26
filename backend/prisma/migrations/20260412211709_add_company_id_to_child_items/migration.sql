-- Step 1: Add columns as nullable first
ALTER TABLE "purchase_invoice_items" ADD COLUMN "company_id" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "company_id" TEXT;

-- Step 2: Backfill from parent tables
UPDATE "purchase_invoice_items" pii
SET "company_id" = pi."company_id"
FROM "purchase_invoices" pi
WHERE pii."purchase_invoice_id" = pi."id";

UPDATE "service_order_items" soi
SET "company_id" = so."company_id"
FROM "service_orders" so
WHERE soi."service_order_id" = so."id";

-- Step 3: Make columns NOT NULL
ALTER TABLE "purchase_invoice_items" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "service_order_items" ALTER COLUMN "company_id" SET NOT NULL;

-- Step 4: Create indexes
CREATE INDEX "purchase_invoice_items_company_id_idx" ON "purchase_invoice_items"("company_id");
CREATE INDEX "service_order_items_company_id_idx" ON "service_order_items"("company_id");
