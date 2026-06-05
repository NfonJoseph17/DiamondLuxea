-- CreateTable: units
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conversion_value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "units_name_key" ON "units"("name");

-- Seed default units (use deterministic IDs for migration)
INSERT INTO "units" ("id", "name", "conversion_value", "created_at", "updated_at") VALUES
  ('unit_bottle_001', 'bottle', 1, NOW(), NOW()),
  ('unit_crate_002', 'crate', 12, NOW(), NOW()),
  ('unit_carton_003', 'carton', 24, NOW(), NOW()),
  ('unit_can_004', 'can', 1, NOW(), NOW()),
  ('unit_unit_005', 'unit', 1, NOW(), NOW());

-- Add base_unit_id to products
ALTER TABLE "products" ADD COLUMN "base_unit_id" TEXT;

-- Add retail_price and wholesale_price to product_price_history
ALTER TABLE "product_price_history" ADD COLUMN "retail_price" DECIMAL(12,2);
ALTER TABLE "product_price_history" ADD COLUMN "wholesale_price" DECIMAL(12,2);

-- Migrate: retail = selling, wholesale = selling * 0.96
UPDATE "product_price_history" SET "retail_price" = "selling_price", "wholesale_price" = "selling_price" * 0.96;

-- Make columns NOT NULL
ALTER TABLE "product_price_history" ALTER COLUMN "retail_price" SET NOT NULL;
ALTER TABLE "product_price_history" ALTER COLUMN "wholesale_price" SET NOT NULL;

-- Drop old columns
ALTER TABLE "product_price_history" DROP COLUMN "supply_price";
ALTER TABLE "product_price_history" DROP COLUMN "selling_price";

-- Add FK for units
ALTER TABLE "products" ADD CONSTRAINT "products_base_unit_id_fkey" 
  FOREIGN KEY ("base_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link products to bottle unit (default for existing)
UPDATE "products" SET "base_unit_id" = (SELECT "id" FROM "units" WHERE "name" = 'bottle' LIMIT 1)
  WHERE "base_unit_id" IS NULL;

-- Add unit columns to sale_items
ALTER TABLE "sale_items" ADD COLUMN "unit_id" TEXT;
ALTER TABLE "sale_items" ADD COLUMN "unit_conversion_value_snapshot" INTEGER;
ALTER TABLE "sale_items" ADD COLUMN "unit_name_snapshot" TEXT;

ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_unit_id_fkey" 
  FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unit columns to purchase_items
ALTER TABLE "purchase_items" ADD COLUMN "unit_id" TEXT;
ALTER TABLE "purchase_items" ADD COLUMN "unit_conversion_value_snapshot" INTEGER;
ALTER TABLE "purchase_items" ADD COLUMN "unit_name_snapshot" TEXT;

ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_unit_id_fkey" 
  FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop unit_supply_price from purchase_items (no longer used)
ALTER TABLE "purchase_items" DROP COLUMN IF EXISTS "unit_supply_price";

-- Create index for products base_unit_id
CREATE INDEX "products_base_unit_id_idx" ON "products"("base_unit_id");
