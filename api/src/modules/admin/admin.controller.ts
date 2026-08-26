import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { BetStatus, LimitScope, Prisma, SelectionStatus, UserStatus, WalletTransactionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminAuditInterceptor } from "../audit/admin-audit.interceptor";
import { BettingService } from "../betting/betting.service";
import { OperatorControlsService } from "../operator-controls/operator-controls.service";

class SettleOutcomeDto { @IsEnum(SelectionStatus) status!: SelectionStatus; @IsOptional() @IsString() result?: string; }
class LimitDto {
  @IsEnum(LimitScope) scope!: LimitScope; @IsString() referenceId!: string;
  @IsInt() @Min(0) minimumStakeTzs!: number; @IsInt() @Min(1) maximumStakeTzs!: number;
  @IsInt() @Min(1) maximumPayoutTzs!: number; @IsNumber() @Min(1.01) maximumOdds!: number;
  @IsInt() @Min(1) maximumSelections!: number; @IsOptional() @IsInt() priority?: number; @IsOptional() @IsBoolean() active?: boolean;
}
class SettingsDto {
  @IsBoolean() bettingEnabled!: boolean; @IsInt() @Min(500) minimumBookingStakeTzs!: number; @IsBoolean() depositsEnabled!: boolean; @IsBoolean() withdrawalsEnabled!: boolean;
  @IsInt() @Min(1000) minimumDepositTzs!: number; @IsInt() @Min(1000) maximumDepositTzs!: number; @IsInt() @Min(1000) dailyDepositLimitTzs!: number;
  @IsInt() @Min(1000) minimumWithdrawalTzs!: number; @IsInt() @Min(1000) maximumWithdrawalTzs!: number; @IsInt() @Min(1000) dailyWithdrawalLimitTzs!: number;
  @IsInt() @Min(1000) manualReviewWithdrawalTzs!: number;
  @IsBoolean() requirePhoneVerificationForBetting!: boolean; @IsBoolean() requirePhoneVerificationForWithdraw!: boolean;
  @IsInt() @Min(1) maximumUnverifiedStakeTzs!: number; @IsInt() @Min(1) maximumUnverifiedPayoutTzs!: number;
  @IsOptional() @IsString() @MaxLength(500) maintenanceMessage?: string;
}
class UserStatusDto { @IsEnum(UserStatus) status!: UserStatus; }

@UseGuards(JwtAuthGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller("admin/risk")
export class AdminController {
  constructor(private db: PrismaService, private betting: BettingService, private controls: OperatorControlsService) {}
  private admin(user: { role: string }) { if (user.role !== "ADMIN") throw new ForbiddenException("Admin access required"); }

  @Get("dashboard")
  async dashboard(@CurrentUser() user: { role: string }) {
    this.admin(user);
    const [bets, stake, payout, exposure, highRisk, pendingWithdrawals, users] = await Promise.all([
      this.db.bet.count(), this.db.bet.aggregate({ _sum: { stakeTzs: true } }), this.db.bet.aggregate({ _sum: { payoutTzs: true } }),
      this.db.exposure.aggregate({ _sum: { liabilityTzs: true } }), this.db.exposure.findMany({ orderBy: { liabilityTzs: "desc" }, take: 20 }),
      this.db.walletTransaction.count({ where: { type: "WITHDRAWAL", status: { in: ["PENDING", "PROCESSING"] } } }), this.db.user.count({ where: { status: "ACTIVE" } }),
    ]);
    return { bets, users, pendingWithdrawals, totalStakeTzs: stake._sum.stakeTzs ?? 0, totalPayoutTzs: payout._sum.payoutTzs ?? 0, openLiabilityTzs: exposure._sum.liabilityTzs ?? 0, highRisk };
  }

  @Get("audit-logs")
  async auditLogs(@CurrentUser() user: { role: string }, @Query("q") query?: string) {
    this.admin(user);
    const logs = await this.db.adminAuditLog.findMany({ where: query ? { OR: [{ action: { contains: query, mode: "insensitive" } }, { entityType: { contains: query, mode: "insensitive" } }, { entityId: { contains: query } }] } : {}, orderBy: { createdAt: "desc" }, take: 250 });
    const actors = await this.db.user.findMany({ where: { id: { in: [...new Set(logs.map(x => x.actorId))] } }, select: { id: true, name: true, phone: true } });
    const names = new Map(actors.map(x => [x.id, x]));
    return logs.map(log => ({ ...log, actor: names.get(log.actorId) ?? null }));
  }
  @Get("settings") settings(@CurrentUser() user: { role: string }) { this.admin(user); return this.controls.settings(); }
  @Patch("settings") async updateSettings(@CurrentUser() user: { id: string; role: string }, @Body() dto: SettingsDto) {
    this.admin(user);
    if (dto.minimumDepositTzs > dto.maximumDepositTzs || dto.minimumWithdrawalTzs > dto.maximumWithdrawalTzs) throw new BadRequestException("Minimum values cannot exceed maximum values");
    if (dto.maximumDepositTzs > dto.dailyDepositLimitTzs || dto.maximumWithdrawalTzs > dto.dailyWithdrawalLimitTzs) throw new BadRequestException("Per-request maximum cannot exceed the daily limit");
    return this.db.operatorSettings.upsert({ where: { id: "default" }, create: { id: "default", ...dto, updatedBy: user.id }, update: { ...dto, updatedBy: user.id } });
  }

  @Get("bets") bets(@CurrentUser() user: { role: string }, @Query("status") status?: BetStatus) { this.admin(user); return this.db.bet.findMany({ where: status ? { status } : {}, include: { user: { select: { id: true, name: true, phone: true } }, selections: true }, orderBy: { placedAt: "desc" }, take: 200 }); }
  @Post("outcomes/:id/settle") settleOutcome(@CurrentUser() user: { id: string; role: string }, @Param("id") id: string, @Body() dto: SettleOutcomeDto) { this.admin(user); return this.betting.settleOutcome(user.id, id, dto.status, dto.result); }
  @Get("bookings") bookings(@CurrentUser() user: { role: string }) { this.admin(user); return this.db.bookingCode.findMany({ orderBy: { createdAt: "desc" }, take: 200 }); }
  @Patch("bookings/:id/cancel") cancel(@CurrentUser() user: { role: string }, @Param("id") id: string) { this.admin(user); return this.db.bookingCode.update({ where: { id }, data: { status: "CANCELLED" } }); }

  @Get("limits") limits(@CurrentUser() user: { role: string }) { this.admin(user); return this.db.stakeLimit.findMany({ orderBy: [{ priority: "desc" }, { updatedAt: "desc" }] }); }
  @Post("limits") limit(@CurrentUser() user: { role: string }, @Body() dto: LimitDto) { this.admin(user); return this.db.stakeLimit.upsert({ where: { scope_referenceId: { scope: dto.scope, referenceId: dto.referenceId } }, create: dto, update: dto }); }

  @Get("withdrawals") withdrawals(@CurrentUser() user: { role: string }, @Query("status") status?: WalletTransactionStatus) {
    this.admin(user);
    return this.db.walletTransaction.findMany({ where: { type: "WITHDRAWAL", ...(status ? { status } : {}) }, include: { wallet: { include: { user: { select: { id: true, name: true, phone: true, status: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  }
  @Patch("withdrawals/:id/approve")
  async approveWithdrawal(@CurrentUser() user: { id: string; role: string }, @Param("id") id: string) {
    this.admin(user);
    const changed = await this.db.walletTransaction.updateMany({ where: { id, type: "WITHDRAWAL", status: "PENDING" }, data: { status: "PROCESSING", description: "Withdrawal approved for payout", metadata: { reviewedBy: user.id, reviewedAt: new Date().toISOString() } } });
    if (changed.count !== 1) throw new BadRequestException("Only pending withdrawals can be approved");
    return { success: true };
  }
  @Patch("withdrawals/:id/complete") async completeWithdrawal(@CurrentUser() user: { id: string; role: string }, @Param("id") id: string) {
    this.admin(user);
    const changed = await this.db.walletTransaction.updateMany({ where: { id, type: "WITHDRAWAL", status: "PROCESSING" }, data: { status: "COMPLETED", completedAt: new Date(), description: "Withdrawal payout completed", metadata: { completedBy: user.id } } });
    if (changed.count !== 1) throw new BadRequestException("Only approved withdrawals can be completed");
    return { success: true };
  }
  @Patch("withdrawals/:id/reject") async rejectWithdrawal(@CurrentUser() user: { id: string; role: string }, @Param("id") id: string) {
    this.admin(user);
    return this.db.$transaction(async tx => {
      const entry = await tx.walletTransaction.findUniqueOrThrow({ where: { id } });
      if (entry.type !== "WITHDRAWAL" || !["PENDING", "PROCESSING"].includes(entry.status)) throw new BadRequestException("Withdrawal is already finalized");
      const changed = await tx.walletTransaction.updateMany({ where: { id, status: { in: ["PENDING", "PROCESSING"] } }, data: { status: "FAILED", description: "Withdrawal rejected and funds returned", metadata: { rejectedBy: user.id } } });
      if (changed.count !== 1) throw new BadRequestException("Withdrawal status changed. Refresh and try again");
      const amount = Math.abs(entry.amountTzs);
      const wallet = await tx.wallet.update({ where: { id: entry.walletId }, data: { availableBalanceTzs: { increment: amount }, withdrawableTzs: { increment: amount }, version: { increment: 1 } } });
      await tx.notification.create({ data: { userId: wallet.userId, title: "Withdrawal rejected", message: "Your withdrawal " + entry.reference + " was not completed and TZS " + amount.toLocaleString() + " was returned to your wallet.", link: "/wallet" } });
      return { success: true, refundedTzs: amount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  @Get("users") users(@CurrentUser() user: { role: string }, @Query("q") query?: string) { this.admin(user); return this.db.user.findMany({ where: query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { phone: { contains: query } }, { email: { contains: query, mode: "insensitive" } }] } : {}, select: { id: true, name: true, phone: true, email: true, role: true, status: true, phoneVerifiedAt: true, createdAt: true, wallet: true }, orderBy: { createdAt: "desc" }, take: 100 }); }
  @Patch("users/:id/status") userStatus(@CurrentUser() user: { id: string; role: string }, @Param("id") id: string, @Body() dto: UserStatusDto) { this.admin(user); if (user.id === id) throw new BadRequestException("You cannot change your own account status"); return this.db.user.update({ where: { id }, data: { status: dto.status }, select: { id: true, name: true, phone: true, status: true } }); }
  @Get("users/:id") async userDetail(@CurrentUser() user: { role: string }, @Param("id") id: string) {
    this.admin(user);
    const detail = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, phone: true, email: true, role: true, status: true, phoneVerifiedAt: true, createdAt: true, lastLoginAt: true,
        wallet: { select: { availableBalanceTzs: true, withdrawableTzs: true, bonusBalanceTzs: true, lockedBalanceTzs: true, transactions: { orderBy: { createdAt: "desc" }, take: 100 } } },
        bets: { orderBy: { placedAt: "desc" }, take: 100, select: { id: true, ticketCode: true, bookingCode: true, status: true, stakeTzs: true, totalOdds: true, potentialReturnTzs: true, payoutTzs: true, placedAt: true, settledAt: true, selections: { select: { matchName: true, marketName: true, selection: true, odds: true, status: true } } } },
      },
    });
    if (!detail) throw new NotFoundException("User not found");
    const totals = await this.db.bet.aggregate({ where: { userId: id }, _sum: { stakeTzs: true, payoutTzs: true }, _count: true });
    return { ...detail, totals: { betCount: totals._count, totalStakedTzs: totals._sum.stakeTzs ?? 0, totalPayoutTzs: totals._sum.payoutTzs ?? 0 } };
  }
}