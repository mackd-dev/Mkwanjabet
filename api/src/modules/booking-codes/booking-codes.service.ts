import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BetStatus, Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BookingSelectionDto, PlaceBetDto, SaveBookingCodeDto, ValidateBetPreviewDto } from "./dto/booking-code.dto";

@Injectable()
export class BookingCodesService {
  constructor(private readonly db: PrismaService) {}

  private code() {
    return `MKB-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
  }

  private ticketCode() {
    return `MB-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }

  private assertSelections(selections: BookingSelectionDto[]) {
    const markets = new Set<string>();
    for (const item of selections) {
      const key = `${item.eventId}:${item.marketId}`;
      if (markets.has(key)) throw new BadRequestException(`Only one outcome from ${item.matchName} / ${item.marketName} is allowed`);
      markets.add(key);
    }
  }

  async save(dto: SaveBookingCodeDto) {
    this.assertSelections(dto.selections);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 8; i++) {
      try {
        const booking = await this.db.bookingCode.create({
          data: {
            code: this.code(),
            stakeTzs: dto.stakeTzs,
            selections: dto.selections as unknown as Prisma.InputJsonValue,
            expiresAt,
          },
        });
        return this.toResponse(booking);
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      }
    }
    throw new BadRequestException("Could not generate a unique booking code");
  }

  async load(code: string) {
    const booking = await this.db.bookingCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!booking) throw new NotFoundException("Booking code not found");
    if (booking.status !== "ACTIVE" || booking.expiresAt <= new Date()) {
      if (booking.status === "ACTIVE") await this.db.bookingCode.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Booking code has expired or is no longer active");
    }
    return this.toResponse(booking);
  }

  async validatePreview(dto: ValidateBetPreviewDto) {
    this.assertSelections(dto.selections);
    const errors: string[] = [];
    const warnings: string[] = [];
    const selectionResults = [];

    for (const selection of dto.selections) {
      const event = await this.db.event.findFirst({
        where: { OR: [{ id: selection.eventId }, { slug: selection.eventId }] },
        include: { markets: { where: { id: selection.marketId }, include: { outcomes: { where: { id: selection.outcomeId } } } } },
      });
      const market = event?.markets[0];
      const outcome = market?.outcomes[0];
      const currentOdds = outcome?.currentOdds == null ? null : Number(outcome.currentOdds);
      const resultErrors: string[] = [];
      const resultWarnings: string[] = [];

      if (!event) resultErrors.push("Event not found");
      else if (["CANCELLED", "FINISHED", "ABANDONED", "POSTPONED", "SUSPENDED"].includes(event.status)) resultErrors.push(`Event is ${event.status.toLowerCase()}`);
      if (event && !market) resultErrors.push("Market not found");
      else if (market && market.status !== "OPEN") resultErrors.push(`Market is ${market.status.toLowerCase()}`);
      if (market && !outcome) resultErrors.push("Outcome not found");
      else if (outcome && outcome.status !== "ACTIVE") resultErrors.push(`Outcome is ${outcome.status.toLowerCase()}`);
      if (currentOdds != null && Math.abs(currentOdds - Number(selection.odds)) >= 0.0001) resultWarnings.push(`Odds changed from ${Number(selection.odds).toFixed(2)} to ${currentOdds.toFixed(2)}`);

      errors.push(...resultErrors.map(message => `${selection.matchName}: ${message}`));
      warnings.push(...resultWarnings.map(message => `${selection.matchName}: ${message}`));
      selectionResults.push({
        eventId: selection.eventId,
        marketId: selection.marketId,
        outcomeId: selection.outcomeId,
        matchName: selection.matchName,
        marketName: selection.marketName,
        selection: selection.selection,
        requestedOdds: Number(selection.odds),
        currentOdds,
        status: resultErrors.length ? "INVALID" : resultWarnings.length ? "WARNING" : "READY",
        errors: resultErrors,
        warnings: resultWarnings,
      });
    }

    if (dto.selections.length > 30) errors.push("Maximum 30 selections allowed");
    if (dto.stakeTzs < 500) errors.push("Minimum stake is TZS 500");
    if (dto.stakeTzs > 2_000_000) errors.push("Maximum stake is TZS 2,000,000");

    const totalOdds = selectionResults.reduce((total, selection) => total * Number(selection.currentOdds ?? selection.requestedOdds), 1);
    const potentialReturnTzs = Math.floor(dto.stakeTzs * totalOdds);
    if (potentialReturnTzs > 100_000_000) errors.push("Maximum payout is TZS 100,000,000");

    return {
      valid: errors.length === 0,
      status: errors.length ? "INVALID" : warnings.length ? "WARNING" : "READY",
      errors,
      warnings,
      totalOdds: Number(totalOdds.toFixed(4)),
      stakeTzs: dto.stakeTzs,
      potentialReturnTzs,
      selections: selectionResults,
      message: errors.length ? "Ticket needs changes before placement." : warnings.length ? "Ticket is valid, but review odds changes." : "Ticket is ready for wallet-backed placement.",
    };
  }

  async validateForUser(userId: string, dto: ValidateBetPreviewDto) {
    const preview = await this.validatePreview(dto);
    const wallet = await this.db.wallet.findUnique({ where: { userId } });
    const walletErrors = [...preview.errors];
    if (!wallet) walletErrors.push("Wallet is not ready for betting");
    else if (wallet.availableBalanceTzs < dto.stakeTzs) walletErrors.push("Insufficient wallet balance");

    return {
      ...preview,
      valid: preview.valid && walletErrors.length === preview.errors.length,
      status: walletErrors.length > preview.errors.length ? "INVALID" : preview.status,
      errors: walletErrors,
      wallet: wallet ? {
        availableBalanceTzs: wallet.availableBalanceTzs,
        lockedBalanceTzs: wallet.lockedBalanceTzs,
        withdrawableTzs: wallet.withdrawableTzs,
        bonusBalanceTzs: wallet.bonusBalanceTzs,
        enoughBalance: wallet.availableBalanceTzs >= dto.stakeTzs,
      } : null,
      message: walletErrors.length > preview.errors.length ? "Ticket is valid structurally, but wallet is not ready." : preview.message,
    };
  }

  async placeBet(userId: string, dto: PlaceBetDto) {
    const validation = await this.validateForUser(userId, dto);
    if (!validation.valid) throw new BadRequestException({ message: "Bet validation failed", errors: validation.errors });

    return this.db.$transaction(async tx => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      const locked = await tx.wallet.updateMany({
        where: { id: wallet.id, version: wallet.version, availableBalanceTzs: { gte: dto.stakeTzs } },
        data: {
          availableBalanceTzs: { decrement: dto.stakeTzs },
          lockedBalanceTzs: { increment: dto.stakeTzs },
          version: { increment: 1 },
        },
      });
      if (locked.count !== 1) throw new BadRequestException("Wallet balance changed. Please try again");

      const ticketCode = this.ticketCode();
      const bet = await tx.bet.create({
        data: {
          userId,
          ticketCode,
          bookingCode: dto.bookingCode?.toUpperCase(),
          status: BetStatus.ACCEPTED,
          stakeTzs: dto.stakeTzs,
          totalOdds: validation.totalOdds,
          potentialReturnTzs: validation.potentialReturnTzs,
          acceptedAt: new Date(),
          selections: {
            create: dto.selections.map(selection => ({
              externalEventId: selection.eventId,
              sport: selection.sport,
              league: selection.league,
              marketId: selection.marketId,
              outcomeId: selection.outcomeId,
              matchName: selection.matchName,
              marketName: selection.marketName,
              selection: selection.selection,
              odds: selection.odds,
            })),
          },
          history: {
            create: [
              { toStatus: BetStatus.PLACED, actorId: userId, reason: "Ticket submitted" },
              { fromStatus: BetStatus.PLACED, toStatus: BetStatus.ACCEPTED, actorId: userId, reason: "Stake locked" },
            ],
          },
        },
        include: { selections: true, history: true },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "BET_STAKE",
          status: "COMPLETED",
          amountTzs: -dto.stakeTzs,
          balanceAfterTzs: wallet.availableBalanceTzs - dto.stakeTzs,
          reference: `STAKE-${ticketCode}`,
          description: `Stake locked for ${ticketCode}`,
          completedAt: new Date(),
          metadata: { betId: bet.id, ticketCode },
        },
      });

      for (const selection of dto.selections) {
        await tx.exposure.upsert({
          where: { scope_eventId_marketId_outcomeId: { scope: "OUTCOME", eventId: selection.eventId, marketId: selection.marketId, outcomeId: selection.outcomeId } },
          create: {
            scope: "OUTCOME",
            eventId: selection.eventId,
            marketId: selection.marketId,
            outcomeId: selection.outcomeId,
            stakeTzs: dto.stakeTzs,
            potentialPayoutTzs: validation.potentialReturnTzs,
            liabilityTzs: Math.max(0, validation.potentialReturnTzs - dto.stakeTzs),
            ticketCount: 1,
          },
          update: {
            stakeTzs: { increment: dto.stakeTzs },
            potentialPayoutTzs: { increment: validation.potentialReturnTzs },
            liabilityTzs: { increment: Math.max(0, validation.potentialReturnTzs - dto.stakeTzs) },
            ticketCount: { increment: 1 },
          },
        });
      }

      if (dto.bookingCode) {
        await tx.bookingCode.updateMany({
          where: { code: dto.bookingCode.toUpperCase(), status: "ACTIVE" },
          data: { status: "USED", usedAt: new Date() },
        });
      }

      return {
        ...bet,
        totalOdds: Number(bet.totalOdds),
        wallet: {
          availableBalanceTzs: wallet.availableBalanceTzs - dto.stakeTzs,
          lockedBalanceTzs: wallet.lockedBalanceTzs + dto.stakeTzs,
        },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private toResponse(booking: { code: string; stakeTzs: number | null; selections: Prisma.JsonValue; expiresAt: Date; createdAt: Date }) {
    return {
      code: booking.code,
      stakeTzs: booking.stakeTzs,
      selections: booking.selections,
      expiresAt: booking.expiresAt,
      createdAt: booking.createdAt,
    };
  }
}
