import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsEnum, IsInt, Matches, Max, Min } from "class-validator";
import { PaymentProvider, Prisma, WalletTransactionStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OperatorControlsService } from "../operator-controls/operator-controls.service";
import { SonicPesaService } from "./sonicpesa.service";

class MoneyRequestDto {
  @IsEnum(PaymentProvider) provider!: PaymentProvider;
  @Matches(/^\+?[1-9]\d{8,14}$/) phone!: string;
  @IsInt() @Min(1000) @Max(10000000) amountTzs!: number;
}

@UseGuards(JwtAuthGuard)
@Controller("wallet")
export class WalletController {
  constructor(private db: PrismaService, private sonic: SonicPesaService, private controls: OperatorControlsService) {}

  @Get("me")
  wallet(@CurrentUser() user: { id: string }) {
    return this.db.wallet.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } } });
  }

  @Get("transactions")
  async transactions(@CurrentUser() user: { id: string }) {
    const wallet = await this.db.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) return [];
    return this.db.walletTransaction.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("deposit")
  async deposit(@CurrentUser() user: { id: string }, @Body() dto: MoneyRequestDto) {
    const settings = await this.controls.settings();
    if (!settings.depositsEnabled) throw new BadRequestException(settings.maintenanceMessage || "Deposits are temporarily unavailable");
    if (dto.amountTzs < settings.minimumDepositTzs || dto.amountTzs > settings.maximumDepositTzs) throw new BadRequestException(`Deposit must be between TZS ${settings.minimumDepositTzs.toLocaleString()} and TZS ${settings.maximumDepositTzs.toLocaleString()}`);
    const wallet = await this.db.wallet.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    const daily = await this.db.walletTransaction.aggregate({ _sum: { amountTzs: true }, where: { walletId: wallet.id, type: "DEPOSIT", status: { in: ["PENDING", "PROCESSING", "COMPLETED"] }, createdAt: { gte: this.controls.startOfDay() } } });
    if ((daily._sum.amountTzs ?? 0) + dto.amountTzs > settings.dailyDepositLimitTzs) throw new BadRequestException("Daily deposit limit exceeded");
    return this.sonic.createDeposit(user.id, dto.amountTzs, dto.provider, dto.phone);
  }

  @Post("deposit/:reference/status")
  depositStatus(@CurrentUser() user: { id: string }, @Param("reference") reference: string) {
    return this.sonic.refreshDeposit(user.id, reference);
  }

  @Post("withdraw")
  async withdraw(@CurrentUser() user: { id: string }, @Body() dto: MoneyRequestDto) {
    const [settings, account] = await Promise.all([this.controls.settings(), this.db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true, phoneVerifiedAt: true } })]);
    if (!settings.withdrawalsEnabled) throw new BadRequestException(settings.maintenanceMessage || "Withdrawals are temporarily unavailable");
    if (dto.phone !== account.phone) throw new BadRequestException("Withdrawals can only be sent to the phone number registered on this account");
    if (settings.requirePhoneVerificationForWithdraw && !account.phoneVerifiedAt) throw new BadRequestException("Phone verification is required for withdrawals");
    if (dto.amountTzs < settings.minimumWithdrawalTzs || dto.amountTzs > settings.maximumWithdrawalTzs) throw new BadRequestException(`Withdrawal must be between TZS ${settings.minimumWithdrawalTzs.toLocaleString()} and TZS ${settings.maximumWithdrawalTzs.toLocaleString()}`);
    return this.db.$transaction(async tx => {
      const wallet = await tx.wallet.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
      const daily = await tx.walletTransaction.aggregate({ _sum: { amountTzs: true }, where: { walletId: wallet.id, type: "WITHDRAWAL", status: { in: [WalletTransactionStatus.PENDING, WalletTransactionStatus.PROCESSING, WalletTransactionStatus.COMPLETED] }, createdAt: { gte: this.controls.startOfDay() } } });
      const usedToday = Math.abs(daily._sum.amountTzs ?? 0);
      if (usedToday + dto.amountTzs > settings.dailyWithdrawalLimitTzs) throw new BadRequestException("Daily withdrawal limit exceeded");
      const reserved = await tx.wallet.updateMany({ where: { id: wallet.id, version: wallet.version, availableBalanceTzs: { gte: dto.amountTzs }, withdrawableTzs: { gte: dto.amountTzs } }, data: { availableBalanceTzs: { decrement: dto.amountTzs }, withdrawableTzs: { decrement: dto.amountTzs }, version: { increment: 1 } } });
      if (reserved.count !== 1) throw new BadRequestException("Insufficient withdrawable balance or wallet balance changed");
      const entry = await tx.walletTransaction.create({ data: { walletId: wallet.id, type: "WITHDRAWAL", status: "PENDING", amountTzs: -dto.amountTzs, provider: dto.provider, reference: `WDR-${Date.now()}-${randomBytes(2).toString("hex").toUpperCase()}`, description: dto.amountTzs >= settings.manualReviewWithdrawalTzs ? "Withdrawal pending manual review" : "Withdrawal queued for review", metadata: { phone: dto.phone, manualReview: dto.amountTzs >= settings.manualReviewWithdrawalTzs } as Prisma.InputJsonValue } });
      await tx.notification.create({ data: { userId: user.id, title: "Withdrawal requested", message: "Your TZS " + dto.amountTzs.toLocaleString() + " withdrawal is pending review.", link: "/wallet" } });
      return entry;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
