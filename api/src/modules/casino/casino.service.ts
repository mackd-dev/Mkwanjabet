import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { CasinoGameStatus, CasinoGameType, CasinoTransactionType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DemoCasinoProviderAdapter } from "./adapters/demo-casino-provider.adapter";
import { CasinoProviderAdapter } from "./adapters/casino-provider.adapter";

const demoGames = [
  { externalId: "aviator", slug: "aviator", name: "Aviator", type: CasinoGameType.CRASH, status: CasinoGameStatus.ACTIVE, accent: "#ff3658", icon: "A", description: "Watch the multiplier climb and cash out before it flies away.", meta: "Demo crash rounds" },
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
    const games = await this.db.casinoGame.findMany({
      where: { provider: { active: true }, status: { not: CasinoGameStatus.DISABLED } },
      include: { provider: true },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return {
      success: true,
      mode: "DEMO",
      games: games.map((game) => ({
        id: game.id,
        slug: game.slug,
        name: game.name,
        tag: this.label(game.type),
        type: game.type,
        status: game.status === CasinoGameStatus.ACTIVE ? "Demo lobby" : "Coming soon",
        provider: game.provider.code,
        accent: game.accent,
        icon: game.icon,
        copy: game.description,
        meta: game.meta,
        launchable: game.status === CasinoGameStatus.ACTIVE,
      })),
    };
  }

  async launchGame(gameIdOrSlug: string, userId?: string) {
    await this.ensureDemoCatalog();
    const game = await this.db.casinoGame.findFirst({
      where: { OR: [{ id: gameIdOrSlug }, { slug: gameIdOrSlug }], status: { not: CasinoGameStatus.DISABLED } },
      include: { provider: true },
    });
    if (!game) throw new NotFoundException("Casino game not found");
    if (game.status !== CasinoGameStatus.ACTIVE) throw new BadRequestException("This game is not launchable yet");
    const adapter = this.adapters[game.provider.adapter];
    if (!adapter) throw new BadRequestException("Casino provider adapter is not available");

    const playMoneyBalanceTzs = 100000;
    const launch = await adapter.launch({ game, provider: game.provider, userId, playMoneyBalanceTzs });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const session = await this.db.casinoSession.create({
      data: {
        providerId: game.providerId,
        gameId: game.id,
        userId,
        providerSessionId: launch.providerSessionId,
        mode: "DEMO",
        playMoneyBalanceTzs,
        launchUrl: launch.launchUrl,
        metadata: launch.metadata as Prisma.InputJsonValue,
        expiresAt,
      },
    });
    await this.db.casinoTransaction.create({
      data: {
        providerId: game.providerId,
        gameId: game.id,
        sessionId: session.id,
        providerTransactionId: `${launch.providerSessionId}-grant`,
        type: CasinoTransactionType.DEMO_CREDIT,
        amountTzs: playMoneyBalanceTzs,
        balanceAfterTzs: playMoneyBalanceTzs,
        metadata: { reason: "demo_play_money_grant" } as Prisma.InputJsonValue,
      },
    });
    return {
      success: true,
      mode: "DEMO",
      session: {
        id: session.id,
        providerSessionId: session.providerSessionId,
        gameId: game.id,
        gameSlug: game.slug,
        gameName: game.name,
        launchUrl: session.launchUrl,
        playMoneyBalanceTzs: session.playMoneyBalanceTzs,
        expiresAt: session.expiresAt,
      },
      message: "Demo play-money session created. No real wallet transaction was processed.",
    };
  }

  private async ensureDemoCatalog() {
    const provider = await this.db.casinoProvider.upsert({
      where: { code: "demo" },
      update: { name: "MkwanjaBet Demo Casino", adapter: "demo", mode: "DEMO", active: true },
      create: { code: "demo", name: "MkwanjaBet Demo Casino", adapter: "demo", mode: "DEMO", active: true },
    });
    await Promise.all(demoGames.map((game) => this.db.casinoGame.upsert({
      where: { providerId_externalId: { providerId: provider.id, externalId: game.externalId } },
      update: { ...game, providerId: provider.id },
      create: { ...game, providerId: provider.id },
    })));
  }

  private label(type: CasinoGameType) {
    return ({ CRASH: "Crash", INSTANT: "Instant", SLOT: "Slots", TABLE: "Table", ARCADE: "Arcade" })[type];
  }
}