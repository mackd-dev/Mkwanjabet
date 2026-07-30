-- V16 betting engine foundation. Review on a staging database before production deploy.
ALTER TYPE "BetStatus" RENAME TO "BetStatus_old";
CREATE TYPE "BetStatus" AS ENUM ('DRAFT','BOOKED','PLACED','ACCEPTED','LIVE','WON','LOST','VOID','REFUNDED','CASHED_OUT','REJECTED','CANCELLED');
ALTER TABLE "Bet" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Bet" ALTER COLUMN "status" TYPE "BetStatus" USING (
  CASE "status"::text WHEN 'OPEN' THEN 'ACCEPTED' ELSE "status"::text END
)::"BetStatus";
ALTER TABLE "Bet" ALTER COLUMN "status" SET DEFAULT 'PLACED';
DROP TYPE "BetStatus_old";

CREATE TYPE "BookingCodeStatus" AS ENUM ('ACTIVE','USED','EXPIRED','CANCELLED');
CREATE TYPE "LimitScope" AS ENUM ('GLOBAL','SPORT','LEAGUE','EVENT','MARKET','USER');
CREATE TYPE "ExposureScope" AS ENUM ('EVENT','MARKET','OUTCOME');

ALTER TABLE "Bet" ADD COLUMN "bookingCode" TEXT;
ALTER TABLE "Bet" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "BetSelection" ALTER COLUMN "externalEventId" SET NOT NULL;
ALTER TABLE "BetSelection" ADD COLUMN "sport" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "BetSelection" ADD COLUMN "league" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "BetSelection" ADD COLUMN "marketId" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "BetSelection" ADD COLUMN "outcomeId" TEXT NOT NULL DEFAULT 'unknown';

CREATE TABLE "BookingCode" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "userId" TEXT, "status" "BookingCodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "stakeTzs" INTEGER, "selections" JSONB NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookingCode_code_key" ON "BookingCode"("code");
CREATE INDEX "BookingCode_status_expiresAt_idx" ON "BookingCode"("status","expiresAt");
CREATE INDEX "BookingCode_userId_createdAt_idx" ON "BookingCode"("userId","createdAt");
ALTER TABLE "BookingCode" ADD CONSTRAINT "BookingCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BetStatusHistory" (
 "id" TEXT NOT NULL, "betId" TEXT NOT NULL, "fromStatus" "BetStatus", "toStatus" "BetStatus" NOT NULL,
 "reason" TEXT, "actorId" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BetStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BetStatusHistory_betId_createdAt_idx" ON "BetStatusHistory"("betId","createdAt");
ALTER TABLE "BetStatusHistory" ADD CONSTRAINT "BetStatusHistory_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StakeLimit" (
 "id" TEXT NOT NULL, "scope" "LimitScope" NOT NULL, "referenceId" TEXT NOT NULL DEFAULT '*',
 "minimumStakeTzs" INTEGER NOT NULL DEFAULT 500, "maximumStakeTzs" INTEGER NOT NULL DEFAULT 2000000,
 "maximumPayoutTzs" INTEGER NOT NULL DEFAULT 100000000, "maximumOdds" DECIMAL(12,4) NOT NULL DEFAULT 1000,
 "maximumSelections" INTEGER NOT NULL DEFAULT 30, "active" BOOLEAN NOT NULL DEFAULT true, "priority" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StakeLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StakeLimit_scope_referenceId_key" ON "StakeLimit"("scope","referenceId");
CREATE INDEX "StakeLimit_active_priority_idx" ON "StakeLimit"("active","priority");

CREATE TABLE "Exposure" (
 "id" TEXT NOT NULL, "scope" "ExposureScope" NOT NULL, "eventId" TEXT NOT NULL, "marketId" TEXT NOT NULL DEFAULT '', "outcomeId" TEXT NOT NULL DEFAULT '',
 "stakeTzs" INTEGER NOT NULL DEFAULT 0, "potentialPayoutTzs" INTEGER NOT NULL DEFAULT 0, "liabilityTzs" INTEGER NOT NULL DEFAULT 0,
 "ticketCount" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Exposure_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Exposure_scope_eventId_marketId_outcomeId_key" ON "Exposure"("scope","eventId","marketId","outcomeId");
CREATE INDEX "Exposure_eventId_liabilityTzs_idx" ON "Exposure"("eventId","liabilityTzs");

CREATE TABLE "CashOutOffer" (
 "id" TEXT NOT NULL, "betId" TEXT NOT NULL, "amountTzs" INTEGER NOT NULL, "acceptedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CashOutOffer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CashOutOffer_betId_expiresAt_idx" ON "CashOutOffer"("betId","expiresAt");
ALTER TABLE "CashOutOffer" ADD CONSTRAINT "CashOutOffer_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Bet_bookingCode_idx" ON "Bet"("bookingCode");
CREATE INDEX "BetSelection_externalEventId_marketId_outcomeId_idx" ON "BetSelection"("externalEventId","marketId","outcomeId");
