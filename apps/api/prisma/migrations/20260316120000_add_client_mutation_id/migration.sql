-- AlterTable
ALTER TABLE "purchases" ADD COLUMN "client_mutation_id" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "client_mutation_id" TEXT;

-- AlterTable
ALTER TABLE "stock_adjustments" ADD COLUMN "client_mutation_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "purchases_client_mutation_id_key" ON "purchases"("client_mutation_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_client_mutation_id_key" ON "sales"("client_mutation_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_client_mutation_id_key" ON "stock_adjustments"("client_mutation_id");
