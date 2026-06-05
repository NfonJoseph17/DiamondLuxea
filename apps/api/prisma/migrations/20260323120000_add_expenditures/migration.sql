-- CreateTable
CREATE TABLE "expenditures" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "spent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenditures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenditures_spent_at_idx" ON "expenditures"("spent_at");

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
