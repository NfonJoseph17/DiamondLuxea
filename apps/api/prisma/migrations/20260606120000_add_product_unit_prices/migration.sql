-- Add per-unit selling prices to products
ALTER TABLE "products" ADD COLUMN "unit_prices" JSONB;
