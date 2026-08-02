CREATE TABLE "AviatorRound" (
  "id" TEXT NOT NULL,
  "gameSlug" TEXT NOT NULL DEFAULT 'aviator',
  "roundNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'BETTING',
  "serverSeedHash" TEXT NOT NULL,
  "serverSeed" TEXT NOT NULL,
  "clientSeed" TEXT NOT NULL DEFAULT 'mkwanjabet-demo',
  "nonce" INTEGER NOT NULL,
  "crashPoint" DECIMAL(8,2) NOT NULL,
  "bettingClosesAt" TIMESTAMP(3) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "crashedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AviatorRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AviatorBet" (
  "id" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "stakeTzs" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLACED',
  "cashoutMultiplier" DECIMAL(8,2),
  "payoutTzs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cashedOutAt" TIMESTAMP(3),
  CONSTRAINT "AviatorBet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AviatorRound_gameSlug_createdAt_idx" ON "AviatorRound"("gameSlug", "createdAt");
CREATE INDEX "AviatorRound_status_startsAt_idx" ON "AviatorRound"("status", "startsAt");
CREATE UNIQUE INDEX "AviatorRound_gameSlug_roundNumber_key" ON "AviatorRound"("gameSlug", "roundNumber");
CREATE UNIQUE INDEX "AviatorBet_roundId_sessionId_key" ON "AviatorBet"("roundId", "sessionId");
CREATE INDEX "AviatorBet_sessionId_createdAt_idx" ON "AviatorBet"("sessionId", "createdAt");
CREATE INDEX "AviatorBet_roundId_status_idx" ON "AviatorBet"("roundId", "status");
ALTER TABLE "AviatorBet" ADD CONSTRAINT "AviatorBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "AviatorRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;