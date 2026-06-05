-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'CASHIER');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('BOTTLE', 'CRATE', 'CARTON', 'CAN', 'UNIT');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('MAIN_STORE', 'BAR', 'DEPOT', 'DISPLAY', 'OTHER');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "AdjustmentReasonType" AS ENUM ('BREAKAGE', 'LOSS', 'COUNT_CORRECTION', 'DAMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'OPENING_BALANCE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CASHIER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT NOT NULL,
    "unit_type" "UnitType" NOT NULL DEFAULT 'UNIT',
    "description" TEXT,
    "low_stock_level" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_history" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "supply_price" DECIMAL(12,2) NOT NULL,
    "purchase_price" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'MAIN_STORE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_balances" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "location_id" TEXT NOT NULL,
    "reference_number" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_purchase_price" DECIMAL(12,2) NOT NULL,
    "unit_supply_price" DECIMAL(12,2),
    "unit_selling_price_snapshot" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_selling_price" DECIMAL(12,2) NOT NULL,
    "unit_purchase_price_snapshot" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "from_location_id" TEXT NOT NULL,
    "to_location_id" TEXT NOT NULL,
    "transferred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "stock_transfer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "adjustment_type" "AdjustmentType" NOT NULL,
    "reason_type" "AdjustmentReasonType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "adjusted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_sessions" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "opened_by_id" TEXT NOT NULL,
    "closed_by_id" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "daily_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "quantity_change" INTEGER NOT NULL,
    "unit_cost_snapshot" DECIMAL(12,2),
    "unit_selling_price_snapshot" DECIMAL(12,2),
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "product_price_history_product_id_effective_from_idx" ON "product_price_history"("product_id", "effective_from");

-- CreateIndex
CREATE INDEX "inventory_balances_location_id_idx" ON "inventory_balances"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_product_id_location_id_key" ON "inventory_balances"("product_id", "location_id");

-- CreateIndex
CREATE INDEX "purchases_purchased_at_idx" ON "purchases"("purchased_at");

-- CreateIndex
CREATE INDEX "purchases_location_id_idx" ON "purchases"("location_id");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items"("purchase_id");

-- CreateIndex
CREATE INDEX "sales_sold_at_idx" ON "sales"("sold_at");

-- CreateIndex
CREATE INDEX "sales_location_id_idx" ON "sales"("location_id");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "stock_transfers_transferred_at_idx" ON "stock_transfers"("transferred_at");

-- CreateIndex
CREATE INDEX "stock_transfer_items_stock_transfer_id_idx" ON "stock_transfer_items"("stock_transfer_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_adjusted_at_idx" ON "stock_adjustments"("adjusted_at");

-- CreateIndex
CREATE INDEX "stock_adjustments_location_id_idx" ON "stock_adjustments"("location_id");

-- CreateIndex
CREATE INDEX "daily_sessions_location_id_status_idx" ON "daily_sessions"("location_id", "status");

-- CreateIndex
CREATE INDEX "inventory_transactions_product_id_transaction_date_idx" ON "inventory_transactions"("product_id", "transaction_date");

-- CreateIndex
CREATE INDEX "inventory_transactions_location_id_transaction_date_idx" ON "inventory_transactions"("location_id", "transaction_date");

-- CreateIndex
CREATE INDEX "inventory_transactions_reference_type_reference_id_idx" ON "inventory_transactions"("reference_type", "reference_id");

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_stock_transfer_id_fkey" FOREIGN KEY ("stock_transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
