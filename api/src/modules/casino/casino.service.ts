import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { CasinoGameStatus, CasinoGameType, CasinoTransactionType, Prisma } from "@prisma/client";
import { createHash, createHmac, randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { DemoCasinoProviderAdapter } from "./adapters/demo-casino-provider.adapter";
import { CasinoProviderAdapter } from "./adapters/casino-provider.adapter";

const demoGames = [
  { externalId: "aviator", slug: "aviator", name: "Aviator", type: CasinoGameType.CRASH, status: CasinoGameStatus.ACTIVE, accent: "#ff3658", icon: "A", description: "Watch the multiplier climb and cash out before it flies away.", meta: "Server demo rounds" },
  { externalId: "rocket-x", slug: "rocket-x", name: "Rocket X", type: CasinoGameType.CRASH, status: CasinoGameStatus.ACTIVE, accent: "#ffd700", icon: "R", description: "Quick multiplier action with instant round history and wallet-ready stakes.", meta: "1.01x - 100x" },
  { externalId: "mkwanja-dice", slug: "mkwanja-dice", name: "Mkwanja Dice", type: CasinoGameType.INSTANT, status: CasinoGameStatus.ACTIVE, accent: "#00b341", icon: "D", description: "Pick your chance, roll instantly, and keep the controls simple.", meta: "Play-money dice" },
  { externalId: "spin-gold", slug: "spin-gold", name: "Spin Gold", type: CasinoGameType.SLOT, status: CasinoGameStatus.COMING_SOON, accent: "#f7b731", icon: "S", description: "Bright slot-style rounds with familiar symbols and easy stake chips.", meta: "Bonus rounds" },
  { externalId: "goal-rush", slug: "goal-rush", name: "Goal Rush", type: CasinoGameType.ARCADE, status: CasinoGameStatus.ACTIVE, accent: "#38bdf8", icon: "G", description: "Football-themed quick game made for short sessions between matches.", meta: "Sports themed" },
  { externalId: "green-roulette", slug: "green-roulette", name: "Green Roulette", type: CasinoGameType.TABLE, status: CasinoGameStatus.COMING_SOON, accent: "#22c55e", icon: "O", description: "Simple table play with a clean mobile layout.", meta: "Classic picks" },
];

@Injectable()
export class CasinoService {
  private readonly adapters: Record<string, CasinoProviderAdapter>;

  constructor(private readonly db: PrismaService, demoAdapter: DemoCasinoProviderAdapter) {
    this.adapters = { [demoAdapter.code]: demoAdapter };
  }

  async listGames() {
    await this.ensureDemoCatalog();
    const games = await this.db.casinoGame.findMany({ where: { provider: { active: true }, status: { not: CasinoGameStatus.DISABLED } }, include: { provider: true }, orderBy: [{ status: "asc" }, { name: "asc" }] });
    return { success: true, mode: "DEMO", games: games.map((game) => ({ id: game.id, slug: game.slug, name: game.name, tag: this.label(game.type), type: game.type, status: game.status === CasinoGameStatus.ACTIVE ? "Demo lobby" : "Coming soon", provider: game.provider.code, accent: game.accent, icon: game.icon, copy: game.description, meta: game.meta, launchable: game.status === CasinoGameStatus.ACTIVE })) };
  }

  async launchGame(gameIdOrSlug: string, userId?: string) {
    await this.ensureDemoCatalog();
    const game = await this.db.casinoGame.findFirst({ where: { OR: [{ id: gameIdOrSlug }, { slug: gameIdOrSlug }], status: { not: CasinoGameStatus.DISABLED } }, include: { provider: true } });
    if (!game) throw new NotFoundException("Casino game not found");
    if (game.status !== CasinoGameStatus.ACTIVE) throw new BadRequestException("This game is not launchable yet");
    const adapter = this.adapters[game.provider.adapter];
    if (!adapter) throw new BadRequestException("Casino provider adapter is not available");
    const playMoneyBalanceTzs = 100000;
    const launch = await adapter.launch({ game, provider: game.provider, userId, playMoneyBalanceTzs });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const session = await this.db.casinoSession.create({ data: { providerId: game.providerId, gameId: game.id, userId, providerSessionId: launch.providerSessionId, mode: "DEMO", playMoneyBalanceTzs, launchUrl: launch.launchUrl, metadata: launch.metadata as Prisma.InputJsonValue, expiresAt } });
    await this.db.casinoTransaction.create({ data: { providerId: game.providerId, gameId: game.id, sessionId: session.id, providerTransactionId: `${launch.providerSessionId}-grant`, type: CasinoTransactionType.DEMO_CREDIT, amountTzs: playMoneyBalanceTzs, balanceAfterTzs: playMoneyBalanceTzs, metadata: { reason: "demo_play_money_grant" } as Prisma.InputJsonValue } });
    return { success: true, mode: "DEMO", session: { id: session.id, providerSessionId: session.providerSessionId, gameId: game.id, gameSlug: game.slug, gameName: game.name, launchUrl: session.launchUrl, playMoneyBalanceTzs: session.playMoneyBalanceTzs, expiresAt: session.expiresAt }, message: "Demo play-money session created. No real wallet transaction was processed." };
  }

  async aviatorCurrent(sessionKey?: string) {
    const round = await this.currentRound();
    await this.settleIfCrashed(round.id);
    const fresh = await this.db.aviatorRound.findUniqueOrThrow({ where: { id: round.id } });
    const session = sessionKey ? await this.findSession(sessionKey) : null;
    const bet = session ? await this.db.aviatorBet.findUnique({ where: { roundId_sessionId: { roundId: fresh.id, sessionId: session.id } } }) : null;
    const history = await this.db.aviatorRound.findMany({ where: { gameSlug: "aviator", status: "CRASHED" }, orderBy: { createdAt: "desc" }, take: 12 });
    return { success: true, round: this.roundView(fresh), session: session ? { id: session.id, providerSessionId: session.providerSessionId, playMoneyBalanceTzs: session.playMoneyBalanceTzs } : null, bet: bet ? this.betView(bet) : null, history: history.map((item) => ({ id: item.id, crash: Number(item.crashPoint), roundNumber: item.roundNumber })) };
  }

  async aviatorBet(sessionKey: string, stakeTzs: number) {
    if (!Number.isInteger(stakeTzs) || stakeTzs < 100 || stakeTzs > 50000) throw new BadRequestException("Stake must be between 100 and 50,000 demo TZS");
    const round = await this.currentRound();
    if (this.phase(round).phase !== "BETTING") throw new BadRequestException("Betting is closed for this round");
    const session = await this.findSession(sessionKey);
    if (session.playMoneyBalanceTzs < stakeTzs) throw new BadRequestException("Demo balance is not enough for this stake");
    const result = await this.db.$transaction(async (tx) => {
      const existing = await tx.aviatorBet.findUnique({ where: { roundId_sessionId: { roundId: round.id, sessionId: session.id } } });
      if (existing) throw new BadRequestException("You already placed a demo bet on this round");
      const updated = await tx.casinoSession.update({ where: { id: session.id }, data: { playMoneyBalanceTzs: { decrement: stakeTzs } } });
      const bet = await tx.aviatorBet.create({ data: { roundId: round.id, sessionId: session.id, stakeTzs, status: "PLACED" } });
      await tx.casinoTransaction.create({ data: { providerId: session.providerId, gameId: session.gameId, sessionId: session.id, providerTransactionId: `aviator-${bet.id}-stake`, type: CasinoTransactionType.DEMO_DEBIT, amountTzs: -stakeTzs, balanceAfterTzs: updated.playMoneyBalanceTzs, metadata: { roundId: round.id } as Prisma.InputJsonValue } });
      return { bet, session: updated };
    });
    return { success: true, round: this.roundView(round), session: { id: result.session.id, providerSessionId: result.session.providerSessionId, playMoneyBalanceTzs: result.session.playMoneyBalanceTzs }, bet: this.betView(result.bet) };
  }

  async aviatorCashout(sessionKey: string) {
    const round = await this.currentRound();
    const state = this.phase(round);
    if (state.phase !== "FLYING") throw new BadRequestException("Cash out is only available while the plane is flying");
    const session = await this.findSession(sessionKey);
    const bet = await this.db.aviatorBet.findUnique({ where: { roundId_sessionId: { roundId: round.id, sessionId: session.id } } });
    if (!bet || bet.status !== "PLACED") throw new BadRequestException("No active demo bet is available for cash out");
    const cashoutMultiplier = Math.min(state.multiplier, Number(round.crashPoint));
    const payoutTzs = Math.floor(bet.stakeTzs * cashoutMultiplier);
    const result = await this.db.$transaction(async (tx) => {
      const updatedBet = await tx.aviatorBet.update({ where: { id: bet.id }, data: { status: "CASHED_OUT", cashoutMultiplier, payoutTzs, cashedOutAt: new Date() } });
      const updated = await tx.casinoSession.update({ where: { id: session.id }, data: { playMoneyBalanceTzs: { increment: payoutTzs } } });
      await tx.casinoTransaction.create({ data: { providerId: session.providerId, gameId: session.gameId, sessionId: session.id, providerTransactionId: `aviator-${bet.id}-cashout`, type: CasinoTransactionType.DEMO_CREDIT, amountTzs: payoutTzs, balanceAfterTzs: updated.playMoneyBalanceTzs, metadata: { roundId: round.id, multiplier: cashoutMultiplier } as Prisma.InputJsonValue } });
      return { bet: updatedBet, session: updated };
    });
    return { success: true, round: this.roundView(round), session: { id: result.session.id, providerSessionId: result.session.providerSessionId, playMoneyBalanceTzs: result.session.playMoneyBalanceTzs }, bet: this.betView(result.bet) };
  }

  private async currentRound() {
    const latest = await this.db.aviatorRound.findFirst({ where: { gameSlug: "aviator" }, orderBy: { roundNumber: "desc" } });
    if (latest) {
      const state = this.phase(latest);
      if (state.phase !== "CRASHED" || Date.now() - (latest.crashedAt?.getTime() ?? state.crashedAt.getTime()) < 3500) return latest;
    }
    return this.createRound((latest?.roundNumber ?? 0) + 1);
  }

  private async createRound(roundNumber: number) {
    const now = new Date();
    const bettingClosesAt = new Date(now.getTime() + 7000);
    const startsAt = bettingClosesAt;
    const nonce = roundNumber;
    const serverSeed = randomBytes(32).toString("hex");
    const serverSeedHash = createHash("sha256").update(serverSeed).digest("hex");
    const crashPoint = this.crashPoint(serverSeed, "mkwanjabet-demo", nonce);
    return this.db.aviatorRound.create({ data: { gameSlug: "aviator", roundNumber, serverSeed, serverSeedHash, clientSeed: "mkwanjabet-demo", nonce, crashPoint, bettingClosesAt, startsAt } });
  }

  private async settleIfCrashed(roundId: string) {
    const round = await this.db.aviatorRound.findUniqueOrThrow({ where: { id: roundId } });
    const state = this.phase(round);
    if (state.phase !== "CRASHED" || round.status === "CRASHED") return;
    await this.db.$transaction(async (tx) => {
      await tx.aviatorRound.update({ where: { id: round.id }, data: { status: "CRASHED", crashedAt: state.crashedAt } });
      await tx.aviatorBet.updateMany({ where: { roundId: round.id, status: "PLACED" }, data: { status: "LOST" } });
    });
  }

  private phase(round: { startsAt: Date; crashPoint: Prisma.Decimal | number }) {
    const now = Date.now();
    const starts = round.startsAt.getTime();
    const crashPoint = Number(round.crashPoint);
    if (now < starts) return { phase: "BETTING", multiplier: 1, crashedAt: new Date(starts + this.timeToCrashMs(crashPoint)) };
    const elapsed = (now - starts) / 1000;
    const multiplier = Number((1 + elapsed * 0.42 + elapsed * elapsed * 0.085).toFixed(2));
    const crashedAt = new Date(starts + this.timeToCrashMs(crashPoint));
    if (multiplier >= crashPoint) return { phase: "CRASHED", multiplier: crashPoint, crashedAt };
    return { phase: "FLYING", multiplier, crashedAt };
  }

  private timeToCrashMs(crashPoint: number) {
    let elapsed = 0;
    while (elapsed < 60) {
      const multiplier = 1 + elapsed * 0.42 + elapsed * elapsed * 0.085;
      if (multiplier >= crashPoint) return Math.floor(elapsed * 1000);
      elapsed += 0.05;
    }
    return 60000;
  }

  private crashPoint(serverSeed: string, clientSeed: string, nonce: number) {
    const hash = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}`).digest("hex");
    const value = parseInt(hash.slice(0, 13), 16);
    const max = 0x1fffffffffffff;
    const roll = value / max;
    if (roll < 0.04) return 1.0;
    return Math.min(50, Math.max(1.01, Number((0.96 / (1 - roll)).toFixed(2))));
  }

  private async findSession(sessionKey: string) {
    const session = await this.db.casinoSession.findFirst({ where: { OR: [{ id: sessionKey }, { providerSessionId: sessionKey }], mode: "DEMO", status: "OPEN" } });
    if (!session) throw new NotFoundException("Demo casino session not found");
    return session;
  }

  private roundView(round: { id: string; roundNumber: number; serverSeedHash: string; clientSeed: string; nonce: number; startsAt: Date; bettingClosesAt: Date; crashPoint: Prisma.Decimal | number; crashedAt: Date | null }) {
    const state = this.phase(round);
    return { id: round.id, roundNumber: round.roundNumber, phase: state.phase, multiplier: state.multiplier, serverSeedHash: round.serverSeedHash, clientSeed: round.clientSeed, nonce: round.nonce, startsAt: round.startsAt, bettingClosesAt: round.bettingClosesAt, crashedAt: state.phase === "CRASHED" ? state.crashedAt : round.crashedAt, crashPoint: state.phase === "CRASHED" ? Number(round.crashPoint) : null };
  }

  private betView(bet: { id: string; stakeTzs: number; status: string; cashoutMultiplier: Prisma.Decimal | null; payoutTzs: number | null }) {
    return { id: bet.id, stakeTzs: bet.stakeTzs, status: bet.status, cashoutMultiplier: bet.cashoutMultiplier ? Number(bet.cashoutMultiplier) : null, payoutTzs: bet.payoutTzs };
  }

  private async ensureDemoCatalog() {
    const provider = await this.db.casinoProvider.upsert({ where: { code: "demo" }, update: { name: "MkwanjaBet Demo Casino", adapter: "demo", mode: "DEMO", active: true }, create: { code: "demo", name: "MkwanjaBet Demo Casino", adapter: "demo", mode: "DEMO", active: true } });
    await Promise.all(demoGames.map((game) => this.db.casinoGame.upsert({ where: { providerId_externalId: { providerId: provider.id, externalId: game.externalId } }, update: { ...game, providerId: provider.id }, create: { ...game, providerId: provider.id } })));
  }

  private label(type: CasinoGameType) {
    return ({ CRASH: "Crash", INSTANT: "Instant", SLOT: "Slots", TABLE: "Table", ARCADE: "Arcade" })[type];
  }
}