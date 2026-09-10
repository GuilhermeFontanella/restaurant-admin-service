-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'AWAITING_CONFIRMATION';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "confirmationToken" TEXT,
ADD COLUMN     "confirmationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailConfirmadoEm" TIMESTAMP(3),
ADD COLUMN     "senhaCriptografada" TEXT,
ALTER COLUMN "nomeDono" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'AWAITING_CONFIRMATION';

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "padrao" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "leads_confirmationToken_key" ON "leads"("confirmationToken");

