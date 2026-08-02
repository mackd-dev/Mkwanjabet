CREATE TYPE "CasinoGameType" AS ENUM ('CRASH', 'INSTANT', 'SLOT', 'TABLE', 'ARCADE');
CREATE TYPE "CasinoGameStatus" AS ENUM ('ACTIVE', 'COMING_SOON', 'DISABLED');
CREATE TYPE "CasinoSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'EXPIRED');
CREATE TYPE "CasinoTransactionType" AS ENUM ('DEMO_DEBIT', 'DEMO_CREDIT', 'DEMO_REFUND', 'PROVIDER_ADJUSTMENT');
CREATE TYPE "CasinoTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

CREATE TABLE "CasinoProvider" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "adapter" TEXT NOT NULL DEFAULT 'demo',
  "mode" TEXT NOT NULL DEFAULT 'DEMO',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CasinoProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CasinoGame" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CasinoGameType" NOT NULL,
  "status" "CasinoGameStatus" NOT NULL DEFAULT 'ACTIVE',
  "accent" TEXT NOT NULL DEFAULT '#00b341',
  "icon" TEXT NOT NULL DEFAULT '*',
  "description" TEXT NOT NULL,
  "meta" TEXT NOT NULL,
  "launchPath" TEXT,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CasinoGame_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CasinoSession" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "userId" TEXT,
  "providerSessionId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'DEMO',
  "status" "CasinoSessionStatus" NOT NULL DEFAULT 'OPEN',
  "playMoneyBalanceTzs" INTEGER NOT NULL DEFAULT 100000,
  "launchUrl" TEXT NOT NULL,
  "metadata" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CasinoSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CasinoTransaction" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "providerTransactionId" TEXT NOT NULL,
  "type" "CasinoTransactionType" NOT NULL,
  "status" "CasinoTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  "amountTzs" INTEGER NOT NULL,
  "balanceAfterTzs" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CasinoTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CasinoProvider_code_key" ON "CasinoProvider"("code");
CREATE INDEX "CasinoProvider_active_adapter_idx" ON "CasinoProvider"("active", "adapter");
CREATE UNIQUE INDEX "CasinoGame_slug_key" ON "CasinoGame"("slug");
CREATE UNIQUE INDEX "CasinoGame_providerId_externalId_key" ON "CasinoGame"("providerId", "externalId");
CREATE INDEX "CasinoGame_status_type_idx" ON "CasinoGame"("status", "type");
CREATE UNIQUE INDEX "CasinoSession_providerSessionId_key" ON "CasinoSession"("providerSessionId");
CREATE INDEX "CasinoSession_userId_createdAt_idx" ON "CasinoSession"("userId", "createdAt");
CREATE INDEX "CasinoSession_gameId_status_idx" ON "CasinoSession"("gameId", "status");
CREATE INDEX "CasinoSession_providerId_createdAt_idx" ON "CasinoSession"("providerId", "createdAt");
CREATE UNIQUE INDEX "CasinoTransaction_providerTransactionId_key" ON "CasinoTransaction"("providerTransactionId");
CREATE INDEX "CasinoTransaction_sessionId_createdAt_idx" ON "CasinoTransaction"("sessionId", "createdAt");
CREATE INDEX "CasinoTransaction_providerId_createdAt_idx" ON "CasinoTransaction"("providerId", "createdAt");

ALTER TABLE "CasinoGame" ADD CONSTRAINT "CasinoGame_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CasinoProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CasinoSession" ADD CONSTRAINT "CasinoSession_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CasinoProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CasinoSession" ADD CONSTRAINT "CasinoSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "CasinoGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CasinoSession" ADD CONSTRAINT "CasinoSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CasinoTransaction" ADD CONSTRAINT "CasinoTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CasinoProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CasinoTransaction" ADD CONSTRAINT "CasinoTransaction_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "CasinoGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CasinoTransaction" ADD CONSTRAINT "CasinoTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CasinoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;