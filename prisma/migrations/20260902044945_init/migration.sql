-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nomeEstabelecimento" TEXT NOT NULL,
    "cnpj" TEXT,
    "nomeDono" TEXT NOT NULL,
    "emailContato" TEXT NOT NULL,
    "telefoneContato" TEXT NOT NULL,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "planoInteresseId" TEXT,
    "mensagem" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "motivoRejeicao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidoEm" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "razaoSocial" TEXT,
    "cnpj" TEXT NOT NULL,
    "enderecoRua" TEXT,
    "enderecoNumero" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "donoNome" TEXT NOT NULL,
    "donoCpf" TEXT,
    "donoEmail" TEXT NOT NULL,
    "donoTelefone" TEXT NOT NULL,
    "contatoNome" TEXT,
    "contatoEmail" TEXT,
    "contatoTelefone" TEXT,
    "tenantSlug" TEXT NOT NULL,
    "status" "RestaurantStatus" NOT NULL DEFAULT 'TRIAL',
    "leadId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(65,30) NOT NULL,
    "periodicidade" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "planId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialStartsAt" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "subscriptionStartsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_cnpj_key" ON "restaurants"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_tenantSlug_key" ON "restaurants"("tenantSlug");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_leadId_key" ON "restaurants"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_restaurantId_key" ON "subscriptions"("restaurantId");

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
