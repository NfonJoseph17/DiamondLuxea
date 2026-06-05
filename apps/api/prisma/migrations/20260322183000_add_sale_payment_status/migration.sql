-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PAID';
ALTER TABLE "sales" ADD COLUMN "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Historical sales: treat as fully paid
UPDATE "sales" SET "amount_paid" = "total_amount";
