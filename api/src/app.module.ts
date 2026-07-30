import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { PicksModule } from "./modules/picks/picks.module";
import { ResultsModule } from "./modules/results/results.module";
import { PlansModule } from "./modules/plans/plans.module";
import { UsersModule } from "./modules/users/users.module";
import { SavedPicksModule } from "./modules/saved-picks/saved-picks.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { BetsModule } from "./modules/bets/bets.module";
import { KycModule } from "./modules/kyc/kyc.module";
import { ResponsibleGamingModule } from "./modules/responsible-gaming/responsible-gaming.module";
import { BettingModule } from "./modules/betting/betting.module";
import { AdminModule } from "./modules/admin/admin.module";
import { SportsbookModule } from "./modules/sportsbook/sportsbook.module";

@Module({ imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]), PrismaModule,
  HealthModule, AuthModule, PicksModule, ResultsModule, PlansModule, UsersModule,
  SavedPicksModule, NotificationsModule, SubscriptionsModule, PaymentsModule,
  WalletModule, BetsModule, KycModule, ResponsibleGamingModule, BettingModule, AdminModule,
  SportsbookModule,
]})
export class AppModule {}
