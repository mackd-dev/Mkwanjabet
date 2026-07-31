CREATE TABLE "OperatorSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "bettingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "depositsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "withdrawalsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "minimumDepositTzs" INTEGER NOT NULL DEFAULT 1000,
  "maximumDepositTzs" INTEGER NOT NULL DEFAULT 10000000,
  "dailyDepositLimitTzs" INTEGER NOT NULL DEFAULT 20000000,
  "minimumWithdrawalTzs" INTEGER NOT NULL DEFAULT 1000,
  "maximumWithdrawalTzs" INTEGER NOT NULL DEFAULT 5000000,
  "dailyWithdrawalLimitTzs" INTEGER NOT NULL DEFAULT 10000000,
  "manualReviewWithdrawalTzs" INTEGER NOT NULL DEFAULT 500000,
  "requirePhoneVerificationForBetting" BOOLEAN NOT NULL DEFAULT false,
  "requirePhoneVerificationForWithdraw" BOOLEAN NOT NULL DEFAULT false,
  "maximumUnverifiedStakeTzs" INTEGER NOT NULL DEFAULT 50000,
  "maximumUnverifiedPayoutTzs" INTEGER NOT NULL DEFAULT 500000,
  "maintenanceMessage" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperatorSettings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "OperatorSettings" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);