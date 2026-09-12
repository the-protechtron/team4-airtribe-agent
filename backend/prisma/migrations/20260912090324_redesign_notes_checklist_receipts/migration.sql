/*
  Warnings:

  - Added the required column `updated_at` to the `reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "delivered_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "read_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "checklist" JSONB;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "doctor_notes" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
