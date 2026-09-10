-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "mercadoPagoPreapprovalId" TEXT,
ADD COLUMN     "mercadoPagoPayerEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_mercadoPagoPreapprovalId_key" ON "subscriptions"("mercadoPagoPreapprovalId");
