import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MarketStatus, OutcomeStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { slug } from "./odds-feed.service";

type OddsApiOutcome = { name: string; price: number };
type OddsApiMarket = { key: string; outcomes: OddsApiOutcome[] };
type OddsApiBookmaker = { key: string; title: string; last_update: string; markets: OddsApiMarket[] };
type OddsApiEvent = {
  id: string; sport_key: string; commence_time: string;
  home_team: string; away_team: string; bookmakers: OddsApiBookmaker[];
};
type FeedStatus = {
  configured: boolean; running: boolean; lastStartedAt: string | null; lastCompletedAt: string | null;
  lastError: string | null; lastMatched: number; lastSkipped: number; requestsRemaining: number | null; requestsUsed: number | null;
};

const DEFAULT_SPORT_KEYS = [
  "soccer_epl", "soccer_uefa_champs_league", "soccer_spain_la_liga", "soccer_italy_serie_a",
  "soccer_germany_bundesliga", "soccer_france_ligue_one", "soccer_uefa_europa_league",
].join(",");

@Injectable()
export class OddsApiFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OddsApiFeedService.name);
  private timer?: NodeJS.Timeout;
  private syncing?: Promise<FeedStatus>;
  private state: FeedStatus = {
    configured: false, running: false, lastStartedAt: null, lastCompletedAt: null,
    lastError: null, lastMatched: 0, lastSkipped: 0, requestsRemaining: null, requestsUsed: null,
  };

  constructor(private readonly db: PrismaService, private readonly config: ConfigService) {
    this.state.configured = Boolean(this.apiKey());
  }

  onModuleInit() {
    if (!this.state.configured) return;
    const minutes = Math.max(15, Number(this.config.get("ODDS_API_REFRESH_MINUTES") ?? 30));
    this.timer = setInterval(() => void this.sync().catch(error => this.logger.error(error)), minutes * 60_000);
    setTimeout(() => void this.sync().catch(error => this.logger.error(error)), 8_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  status() {
    return { ...this.state };
  }

  sync() {
    if (!this.state.configured) throw new ServiceUnavailableException("ODDS_API_KEY is not configured");
    if (!this.syncing) this.syncing = this.performSync().finally(() => { this.syncing = undefined; });
    return this.syncing;
  }

  private async performSync() {
    this.state.running = true;
    this.state.lastStartedAt = new Date().toISOString();
    this.state.lastError = null;
    let matched = 0;
    let skipped = 0;
    try {
      for (const sportKey of this.sportKeys()) {
        const response = await fetch(this.url(sportKey), { signal: AbortSignal.timeout(20_000) });
        this.readQuota(response.headers);
        if (!response.ok) {
          this.logger.warn(`The Odds API returned ${response.status} for ${sportKey}`);
          continue;
        }
        const payload = await response.json().catch(() => null) as OddsApiEvent[] | null;
        if (!Array.isArray(payload)) continue;
        for (const event of payload) {
          if (await this.applyOdds(event)) matched++; else skipped++;
        }
      }
      this.state.lastMatched = matched;
      this.state.lastSkipped = skipped;
      this.state.lastCompletedAt = new Date().toISOString();
      return this.status();
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : "Unknown Odds API feed error";
      throw new ServiceUnavailableException(this.state.lastError);
    } finally {
      this.state.running = false;
    }
  }

  private async applyOdds(source: OddsApiEvent) {
    const homeKey = teamKey(source.home_team);
    const awayKey = teamKey(source.away_team);
    const commenceAt = new Date(source.commence_time);
    if (!homeKey || !awayKey || Number.isNaN(commenceAt.getTime())) return false;

    const windowStart = new Date(commenceAt.getTime() - 36 * 60 * 60_000);
    const windowEnd = new Date(commenceAt.getTime() + 36 * 60 * 60_000);
    const candidates = await this.db.event.findMany({
      where: { startsAt: { gte: windowStart, lte: windowEnd } },
      select: { id: true, homeTeamName: true, awayTeamName: true },
    });
    const match = candidates.find(c =>
      teamKey(c.homeTeamName ?? "") === homeKey && teamKey(c.awayTeamName ?? "") === awayKey);
    if (!match) return false;

    const bookmaker = source.bookmakers?.[0];
    const market = bookmaker?.markets?.find(m => m.key === "h2h");
    if (!market || market.outcomes.length < 2) return false;

    const marginFactor = 1 - Math.max(0, Math.min(0.25, Number(this.config.get("ODDS_API_MARGIN_PCT") ?? 0.06)));
    const priceFor = (outcomeName: string) => market.outcomes.find(o => o.name === outcomeName)?.price;
    const homePrice = priceFor(source.home_team);
    const awayPrice = priceFor(source.away_team);
    const drawPrice = market.outcomes.find(o => o.name.toLowerCase() === "draw")?.price;
    if (!homePrice || !awayPrice) return false;

    const outcomes = [
      { key: "home", name: source.home_team, price: shaded(homePrice, marginFactor) },
      ...(drawPrice ? [{ key: "draw", name: "Draw", price: shaded(drawPrice, marginFactor) }] : []),
      { key: "away", name: source.away_team, price: shaded(awayPrice, marginFactor) },
    ];

    await this.db.$transaction(async tx => {
      let dbMarket = await tx.market.findFirst({ where: { eventId: match.id, key: "match-winner", line: null } });
      dbMarket = dbMarket
        ? await tx.market.update({ where: { id: dbMarket.id }, data: { name: "Match winner", status: MarketStatus.OPEN, suspendedAt: null, suspensionReason: null } })
        : await tx.market.create({ data: { eventId: match.id, key: "match-winner", name: "Match winner", status: MarketStatus.OPEN } });
      for (const [sortOrder, item] of outcomes.entries()) {
        const existing = await tx.outcome.findUnique({ where: { marketId_key: { marketId: dbMarket.id, key: item.key } } });
        const outcome = await tx.outcome.upsert({
          where: { marketId_key: { marketId: dbMarket.id, key: item.key } },
          create: { marketId: dbMarket.id, key: item.key, name: item.name, status: OutcomeStatus.ACTIVE, currentOdds: item.price, sortOrder },
          update: { name: item.name, status: OutcomeStatus.ACTIVE, currentOdds: item.price, sortOrder },
        });
        if (Number(existing?.currentOdds ?? 0) !== item.price) {
          await tx.odds.create({ data: { outcomeId: outcome.id, price: item.price, previousPrice: existing?.currentOdds, source: `odds-api:${bookmaker.key}` } });
        }
      }
    });
    return true;
  }

  private sportKeys() {
    return String(this.config.get("ODDS_API_SPORT_KEYS") ?? DEFAULT_SPORT_KEYS).split(",").map(s => s.trim()).filter(Boolean);
  }

  private url(sportKey: string) {
    const baseUrl = this.config.get<string>("ODDS_API_BASE_URL") ?? "https://api.the-odds-api.com";
    const regions = this.config.get<string>("ODDS_API_REGIONS") ?? "eu";
    const params = new URLSearchParams({ apiKey: this.apiKey(), regions, markets: "h2h", oddsFormat: "decimal" });
    return `${baseUrl.replace(/\/$/, "")}/v4/sports/${sportKey}/odds/?${params}`;
  }

  private apiKey() {
    return this.config.get<string>("ODDS_API_KEY") ?? "";
  }

  private readQuota(headers: Headers) {
    const remaining = headers.get("x-requests-remaining");
    const used = headers.get("x-requests-used");
    this.state.requestsRemaining = remaining == null ? null : Number(remaining);
    this.state.requestsUsed = used == null ? null : Number(used);
  }
}

function shaded(price: number, marginFactor: number) {
  return Math.max(1.01, Math.floor(price * marginFactor * 100) / 100);
}

function teamKey(name: string) {
  const normalized = slug(name).replace(/-(fc|cf|sc|afc|cd|ca|ac)$/, "").replace(/^(fc|cf|sc|afc|cd|ca|ac)-/, "");
  return normalized;
}
