-- Migrate ADMIN users to MANAGER
UPDATE "users" SET role = 'MANAGER' WHERE role = 'ADMIN';

-- Remove ADMIN from Role enum (PostgreSQL requires create new + swap)
CREATE TYPE "Role_new" AS ENUM ('MANAGER', 'CASHIER');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING role::text::"Role_new";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CASHIER';
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Add default_supplier_id to products
ALTER TABLE "products" ADD COLUMN "default_supplier_id" TEXT;
ALTER TABLE "products" ADD CONSTRAINT "products_default_supplier_id_fkey" 
  FOREIGN KEY ("default_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
