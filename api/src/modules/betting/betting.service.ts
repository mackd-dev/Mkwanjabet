import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BetStatus, LimitScope, MarketStatus, OutcomeStatus, Prisma, SelectionStatus, WalletTransactionType } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BetSelectionDto, PlaceBetDto, SaveBookingDto } from "./dto/betting.dto";
import { OperatorControlsService } from "../operator-controls/operator-controls.service";

@Injectable()
export class BettingService {
  constructor(private readonly db: PrismaService, private readonly controls: OperatorControlsService) {}

  private bookingCode() { return `MKB-${randomBytes(2).toString("hex").toUpperCase()}`; }
  private ticketCode() { return `MB-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`; }
  private betStatusLabel(status: BetStatus) {
    if (["PLACED", "ACCEPTED", "LIVE"].includes(status)) return "Open";
    if (status === "WON") return "Won";
    if (status === "LOST") return "Lost";
    if (status === "VOID" || status === "REFUNDED") return "Void";
    if (status === "CASHED_OUT") return "Cashed out";
    return "Open";
  }
  private selectionStatusLabel(status: string) {
    return status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ");
  }
  async myBets(userId: string) {
    const bets = await this.db.bet.findMany({
      where: { userId },
      orderBy: { placedAt: "desc" },
      take: 50,
      include: { selections: { orderBy: { id: "asc" } } },
    });
    return bets.map(bet => ({
      id: bet.ticketCode,
      betId: bet.id,
      bookingCode: bet.bookingCode,
      type: bet.selections.length > 1 ? "Accumulator" : "Single",
      status: this.betStatusLabel(bet.status),
      rawStatus: bet.status,
      stake: bet.stakeTzs,
      odds: Number(bet.totalOdds),
      returnAmount: bet.status === BetStatus.WON ? bet.payoutTzs : bet.status === BetStatus.VOID || bet.status === BetStatus.REFUNDED ? bet.stakeTzs : bet.potentialReturnTzs,
      cashOut: bet.cashOutOfferTzs,
      date: bet.placedAt.toISOString(),
      settledAt: bet.settledAt?.toISOString(),
      acceptedAt: bet.acceptedAt?.toISOString(),
      selections: bet.selections.map(selection => ({
        eventId: selection.externalEventId,
        marketId: selection.marketId,
        outcomeId: selection.outcomeId,
        sport: selection.sport,
        league: selection.league,
        match: selection.matchName,
        market: selection.marketName,
        pick: selection.selection,
        odd: Number(selection.odds),
        state: this.selectionStatusLabel(selection.status),
      })),
    }));
  }
  private totalOdds(selections: BetSelectionDto[]) { return selections.reduce((n, x) => n * Number(x.odds), 1); }
  private async canonicalSelections(input: BetSelectionDto[], acceptOddsChanges = false) {
    const selections: BetSelectionDto[] = [];
    for (const item of input) {
      const outcome = await this.db.outcome.findUnique({ where: { id: item.outcomeId }, include: { market: { include: { event: { include: { sport: true, competition: true } } } } } });
      if (!outcome || outcome.marketId !== item.marketId) throw new BadRequestException(`Selection ${item.selection} is no longer available`);
      const event = outcome.market.event;
      if (event.id !== item.eventId && event.slug !== item.eventId) throw new BadRequestException(`Event mismatch for ${item.selection}`);
      if (!["SCHEDULED","LIVE"].includes(event.status) || outcome.market.status !== "OPEN" || outcome.status !== "ACTIVE" || !outcome.currentOdds) throw new BadRequestException(`${item.selection} is suspended or closed`);
      const currentOdds = Number(outcome.currentOdds);
      if (Math.abs(currentOdds - Number(item.odds)) > 0.0001 && !acceptOddsChanges) throw new BadRequestException(`Odds changed for ${item.selection}: ${item.odds} to ${currentOdds}`);
      selections.push({ eventId:event.id,sport:event.sport.name,league:event.competition.name,marketId:outcome.marketId,outcomeId:outcome.id,matchName:event.name,marketName:outcome.market.name,selection:outcome.name,odds:currentOdds });
    }
    return selections;
  }

  private assertSelections(selections: BetSelectionDto[]) {
    const markets = new Set<string>();
    for (const item of selections) {
      const key = `${item.eventId}:${item.marketId}`;
      if (markets.has(key)) throw new BadRequestException(`Only one outcome from ${item.matchName} / ${item.marketName} is allowed`);
      markets.add(key);
    }
  }

  private async resolveLimit(userId: string, selections: BetSelectionDto[]) {
    const refs = ["*", userId, ...selections.flatMap(s => [s.sport, s.league, s.eventId, s.marketId])];
    const rules = await this.db.stakeLimit.findMany({ where: { active: true, referenceId: { in: refs } }, orderBy: [{ priority: "desc" }, { updatedAt: "desc" }] });
    const rank: Record<LimitScope, number> = { GLOBAL: 0, SPORT: 1, LEAGUE: 2, EVENT: 3, MARKET: 4, USER: 5 };
    return rules.sort((a,b) => rank[b.scope] - rank[a.scope] || b.priority - a.priority)[0] ?? {
      minimumStakeTzs: 500, maximumStakeTzs: 2_000_000, maximumPayoutTzs: 100_000_000,
      maximumOdds: new Prisma.Decimal(1000), maximumSelections: 30, scope: LimitScope.GLOBAL, referenceId: "*"
    };
  }

  async validate(userId: string, dto: PlaceBetDto) {
    const [settings, user] = await Promise.all([
      this.controls.settings(),
      this.db.user.findUnique({ where: { id: userId }, select: { phoneVerifiedAt: true } }),
    ]);
    if (!settings.bettingEnabled) throw new BadRequestException(settings.maintenanceMessage || "Betting is temporarily unavailable");
    const selections = await this.canonicalSelections(dto.selections, dto.acceptOddsChanges);
    this.assertSelections(selections);
    const limit = await this.resolveLimit(userId, selections);
    const odds = this.totalOdds(selections);
    const payout = Math.floor(dto.stakeTzs * odds);
    const errors: string[] = [];
    if (selections.length > limit.maximumSelections) errors.push(`Maximum ${limit.maximumSelections} selections allowed`);
    if (dto.stakeTzs < limit.minimumStakeTzs) errors.push(`Minimum stake is TZS ${limit.minimumStakeTzs.toLocaleString()}`);
    if (dto.stakeTzs > limit.maximumStakeTzs) errors.push(`Maximum stake is TZS ${limit.maximumStakeTzs.toLocaleString()}`);
    if (odds > Number(limit.maximumOdds)) errors.push(`Maximum total odds is ${Number(limit.maximumOdds)}`);
    if (payout > limit.maximumPayoutTzs) errors.push(`Maximum payout is TZS ${limit.maximumPayoutTzs.toLocaleString()}`);
    if (settings.requirePhoneVerificationForBetting && !user?.phoneVerifiedAt && (dto.stakeTzs > settings.maximumUnverifiedStakeTzs || payout > settings.maximumUnverifiedPayoutTzs)) {
      errors.push("Additional account verification is required for this ticket size");
    }
    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.availableBalanceTzs < dto.stakeTzs) errors.push("Insufficient wallet balance");
    return { valid: errors.length === 0, errors, totalOdds: Number(odds.toFixed(4)), potentialReturnTzs: payout, limit, selections };
  }

  async saveBooking(userId: string | null, dto: SaveBookingDto) {
    this.assertSelections(dto.selections);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    for (let i=0;i<8;i++) {
      try {
        const booking = await this.db.bookingCode.create({ data: { code: this.bookingCode(), userId, stakeTzs: dto.stakeTzs, selections: dto.selections as unknown as Prisma.InputJsonValue, expiresAt } });
        return { code: booking.code, expiresAt: booking.expiresAt, selections: dto.selections, stakeTzs: dto.stakeTzs };
      } catch (e) { if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e; }
    }
    throw new BadRequestException("Could not generate a unique booking code");
  }

  async loadBooking(code: string) {
    const booking = await this.db.bookingCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!booking) throw new NotFoundException("Booking code not found");
    if (booking.status !== "ACTIVE" || booking.expiresAt <= new Date()) {
      if (booking.status === "ACTIVE") await this.db.bookingCode.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Booking code has expired or is no longer active");
    }
    return booking;
  }

  async quoteBooking(userId: string, code: string) {
    const booking = await this.loadBooking(code);
    const selections = booking.selections as unknown as BetSelectionDto[];
    const totalOdds = this.totalOdds(selections);
    const [wallet, settings] = await Promise.all([this.db.wallet.findUnique({ where: { userId }, select: { availableBalanceTzs: true } }), this.controls.settings()]);
    const minimumBookingStakeTzs = settings.minimumBookingStakeTzs ?? 500;
    const stakeTzs = Math.max(booking.stakeTzs ?? minimumBookingStakeTzs, minimumBookingStakeTzs);
    return { code: booking.code, stakeTzs, minimumBookingStakeTzs, selectionCount: selections.length, totalOdds: Number(totalOdds.toFixed(4)), potentialReturnTzs: Math.floor(stakeTzs * totalOdds), availableBalanceTzs: wallet?.availableBalanceTzs ?? 0 };
  }
  async placeBooking(userId: string, code: string, stakeTzs: number, acceptOddsChanges = true) {
    const [booking, settings] = await Promise.all([this.loadBooking(code), this.controls.settings()]);
    const minimum = settings.minimumBookingStakeTzs ?? 500;
    if (stakeTzs < minimum) throw new BadRequestException("Minimum booking stake is TZS " + minimum.toLocaleString());
    return this.place(userId, { selections: booking.selections as unknown as BetSelectionDto[], stakeTzs, bookingCode: booking.code, acceptOddsChanges });
  }

  async place(userId: string, dto: PlaceBetDto) {
    const validation = await this.validate(userId, dto);
    if (!validation.valid) throw new BadRequestException({ message: "Bet validation failed", errors: validation.errors });
    return this.db.$transaction(async tx => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      const locked = await tx.wallet.updateMany({ where: { id: wallet.id, version: wallet.version, availableBalanceTzs: { gte: dto.stakeTzs } }, data: { availableBalanceTzs: { decrement: dto.stakeTzs }, lockedBalanceTzs: { increment: dto.stakeTzs }, version: { increment: 1 } } });
      if (locked.count !== 1) throw new BadRequestException("Wallet balance changed. Please try again");
      const bet = await tx.bet.create({ data: {
        userId, ticketCode: this.ticketCode(), bookingCode: dto.bookingCode?.toUpperCase(), status: BetStatus.ACCEPTED,
        stakeTzs: dto.stakeTzs, totalOdds: validation.totalOdds, potentialReturnTzs: validation.potentialReturnTzs, acceptedAt: new Date(),
        selections: { create: validation.selections.map(s => ({ externalEventId:s.eventId,sport:s.sport,league:s.league,marketId:s.marketId,outcomeId:s.outcomeId,matchName:s.matchName,marketName:s.marketName,selection:s.selection,odds:s.odds })) },
        history: { create: [{ toStatus: BetStatus.PLACED, actorId:userId }, { fromStatus:BetStatus.PLACED,toStatus:BetStatus.ACCEPTED,actorId:userId }] }
      }, include: { selections: true, history: true } });
      await tx.walletTransaction.create({ data: { walletId: wallet.id, type:"BET_STAKE", status:"COMPLETED", amountTzs:-dto.stakeTzs, balanceAfterTzs:wallet.availableBalanceTzs-dto.stakeTzs, reference:`STAKE-${bet.ticketCode}`, description:`Stake locked for ${bet.ticketCode}`, completedAt:new Date(), metadata:{betId:bet.id} } });
      for (const s of validation.selections) {
        await tx.exposure.upsert({ where:{ scope_eventId_marketId_outcomeId:{scope:"OUTCOME",eventId:s.eventId,marketId:s.marketId,outcomeId:s.outcomeId}}, create:{scope:"OUTCOME",eventId:s.eventId,marketId:s.marketId,outcomeId:s.outcomeId,stakeTzs:dto.stakeTzs,potentialPayoutTzs:validation.potentialReturnTzs,liabilityTzs:Math.max(0,validation.potentialReturnTzs-dto.stakeTzs),ticketCount:1}, update:{stakeTzs:{increment:dto.stakeTzs},potentialPayoutTzs:{increment:validation.potentialReturnTzs},liabilityTzs:{increment:Math.max(0,validation.potentialReturnTzs-dto.stakeTzs)},ticketCount:{increment:1}} });
      }
      if (dto.bookingCode) await tx.bookingCode.updateMany({ where:{code:dto.bookingCode.toUpperCase(),status:"ACTIVE"}, data:{status:"USED",usedAt:new Date()} });
      return bet;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async settleOutcome(actorId: string, outcomeId: string, status: SelectionStatus, result?: string) {
    if (status === SelectionStatus.PENDING) throw new BadRequestException("A final selection status is required");
    return this.db.$transaction(async tx => {
      const outcome = await tx.outcome.findUnique({ where: { id: outcomeId } });
      if (!outcome) throw new NotFoundException("Outcome not found");
      const affected = await tx.betSelection.findMany({
        where: { outcomeId, status: SelectionStatus.PENDING, bet: { status: { in: [BetStatus.ACCEPTED, BetStatus.LIVE] } } },
        select: { id: true, betId: true },
      });
      await tx.betSelection.updateMany({ where: { id: { in: affected.map(x => x.id) } }, data: { status, result } });
      const settled: Array<{ ticketCode: string; status: BetStatus; payoutTzs: number }> = [];
      for (const betId of [...new Set(affected.map(x => x.betId))]) {
        const bet = await tx.bet.findUniqueOrThrow({ where: { id: betId }, include: { selections: true } });
        if (bet.selections.some(x => x.status === SelectionStatus.PENDING)) continue;
        const lost = bet.selections.some(x => x.status === SelectionStatus.LOST);
        const allVoid = bet.selections.every(x => x.status === SelectionStatus.VOID);
        const finalStatus = lost ? BetStatus.LOST : allVoid ? BetStatus.VOID : BetStatus.WON;
        const effectiveOdds = bet.selections.reduce((total, item) => total * (item.status === SelectionStatus.VOID ? 1 : Number(item.odds)), 1);
        const payoutTzs = lost ? 0 : allVoid ? bet.stakeTzs : Math.floor(bet.stakeTzs * effectiveOdds);
        const changed = await tx.bet.updateMany({ where: { id: bet.id, status: { in: [BetStatus.ACCEPTED, BetStatus.LIVE] } }, data: { status: finalStatus, payoutTzs, settledAt: new Date(), cashOutOfferTzs: null } });
        if (changed.count !== 1) continue;
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: bet.userId } });
        if (wallet.lockedBalanceTzs < bet.stakeTzs) throw new BadRequestException(`Locked balance is inconsistent for ${bet.ticketCode}`);
        await tx.wallet.update({ where: { id: wallet.id }, data: { lockedBalanceTzs: { decrement: bet.stakeTzs }, availableBalanceTzs: { increment: payoutTzs }, withdrawableTzs: { increment: payoutTzs }, version: { increment: 1 } } });
        for (const item of bet.selections) await tx.exposure.updateMany({ where: { scope: "OUTCOME", eventId: item.externalEventId, marketId: item.marketId, outcomeId: item.outcomeId }, data: { stakeTzs: { decrement: bet.stakeTzs }, potentialPayoutTzs: { decrement: bet.potentialReturnTzs }, liabilityTzs: { decrement: Math.max(0, bet.potentialReturnTzs - bet.stakeTzs) }, ticketCount: { decrement: 1 } } });
        if (payoutTzs > 0) await tx.walletTransaction.create({ data: { walletId: wallet.id, type: allVoid ? WalletTransactionType.BET_REFUND : WalletTransactionType.BET_WIN, status: "COMPLETED", amountTzs: payoutTzs, balanceAfterTzs: wallet.availableBalanceTzs + payoutTzs, reference: `${allVoid ? "REFUND" : "WIN"}-${bet.ticketCode}`, description: `${allVoid ? "Stake refund" : "Winnings"} for ${bet.ticketCode}`, completedAt: new Date(), metadata: { betId: bet.id, outcomeId } } });
        await tx.betStatusHistory.create({ data: { betId: bet.id, fromStatus: bet.status, toStatus: finalStatus, actorId, reason: `Outcome ${outcomeId} settled as ${status}`, metadata: { outcomeId, result, payoutTzs } } });
        await tx.notification.create({ data: { userId: bet.userId, title: "Bet " + finalStatus.toLowerCase(), message: payoutTzs > 0 ? bet.ticketCode + " settled with TZS " + payoutTzs.toLocaleString() + " credited to your wallet." : bet.ticketCode + " has been settled as " + finalStatus.toLowerCase() + ".", link: "/my-bets" } });
        settled.push({ ticketCode: bet.ticketCode, status: finalStatus, payoutTzs });
      }
      return { outcomeId, selectionStatus: status, selectionsUpdated: affected.length, betsSettled: settled };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async settleMarket(actorId: string, marketId: string, opts: { winningOutcomeId?: string; void?: boolean; result?: string }) {
    if (!opts.void && !opts.winningOutcomeId) throw new BadRequestException("Choose a winning outcome or void the market");
    const market = await this.db.market.findUniqueOrThrow({ where: { id: marketId }, include: { outcomes: true } });
    if (market.status === MarketStatus.SETTLED || market.status === MarketStatus.VOID) throw new BadRequestException("Market is already finalized");
    if (opts.winningOutcomeId && !market.outcomes.some(x => x.id === opts.winningOutcomeId)) throw new BadRequestException("Winning outcome does not belong to this market");
    const results = [];
    for (const outcome of market.outcomes) {
      const status = opts.void ? SelectionStatus.VOID : outcome.id === opts.winningOutcomeId ? SelectionStatus.WON : SelectionStatus.LOST;
      results.push(await this.settleOutcome(actorId, outcome.id, status, opts.result));
    }
    await this.db.$transaction([
      ...market.outcomes.map(outcome => this.db.outcome.update({ where: { id: outcome.id }, data: { status: opts.void ? OutcomeStatus.VOID : outcome.id === opts.winningOutcomeId ? OutcomeStatus.WON : OutcomeStatus.LOST, settledAt: new Date() } })),
      this.db.market.update({ where: { id: marketId }, data: { status: opts.void ? MarketStatus.VOID : MarketStatus.SETTLED } }),
    ]);
    return { marketId, status: opts.void ? MarketStatus.VOID : MarketStatus.SETTLED, results };
  }
}

