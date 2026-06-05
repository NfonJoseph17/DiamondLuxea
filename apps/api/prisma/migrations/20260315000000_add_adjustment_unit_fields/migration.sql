-- AlterTable: add unit fields to stock_adjustments
ALTER TABLE "stock_adjustments" ADD COLUMN "unit_id" TEXT;
ALTER TABLE "stock_adjustments" ADD COLUMN "unit_conversion_value_snapshot" INTEGER;
ALTER TABLE "stock_adjustments" ADD COLUMN "unit_name_snapshot" TEXT;

-- Add FK for unit_id
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
