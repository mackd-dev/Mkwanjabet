import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventStatus, MarketStatus, OutcomeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { sportName, slug } from "./odds-feed.service";

// Leon Bet API types
type LeonBetRunner = {
  id: number;
  name: string;
  price: number; // stored as cents (÷100 for decimal odds)
  open: boolean;
  handicap?: string;
};

type LeonBetMarket = {
  id: number;
  name: string;
  runners: LeonBetRunner[];
};

type LeonBetCompetitor = {
  id: number;
  name: string;
  score?: number | null;
  imageId?: number | null;
  imageType?: string | null;
};

type LeonBetLeague = {
  id: number;
  name: string;
  sport?: { id: number; name: string; family?: string };
};

type LeonBetEvent = {
  id: number;
  name: string;
  kickoff: number; // Unix timestamp in ms
  matchPhase: string; // "PRE_GAME", "IN_PLAY", "FINISHED"
  homeScore?: number | null;
  awayScore?: number | null;
  league?: LeonBetLeague;
  competitors?: LeonBetCompetitor[];
  markets?: LeonBetMarket[];
  isLive?: boolean;
  startTime?: string;
};

type LeonBetResponse = {
  total?: number;
  liveTotal?: number;
  events?: {
    events?: LeonBetEvent[];
    sports?: { name: string; eventCount: number }[];
  };
};

type FeedStatus = {
  configured: boolean;
  running: boolean;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastError: string | null;
  lastImported: number;
  totalEvents: number;
  totalLiveEvents: number;
};

// Market name mapping (Swahili → English key)
const MARKET_KEY_MAP: Record<string, string> = {
  "mshindi": "match-winner",
  "jumla": "total",
  "jumla ya magoli": "total",
  "handicap": "handicap",
  "handikapi": "handicap",
  "timu zote kufunga": "both-teams-score",
  "timu zote zifunge": "both-teams-score",
  "btts": "both-teams-score",
  "kipindi cha 1: mshindi": "first-half-winner",
  "kufunga goli la 1": "first-goal",
  "timu ya kwanza kufunga": "first-team-to-score",
  "double chance": "double-chance",
  "nafasi mbili": "double-chance",
};

function getMarketKey(leonName: string): string {
  const lower = leonName.toLowerCase().trim();
  // Check for exact match first
  if (MARKET_KEY_MAP[lower]) return MARKET_KEY_MAP[lower];
  // Check for partial match
  for (const [leonKey, engKey] of Object.entries(MARKET_KEY_MAP)) {
    if (lower.includes(leonKey) || leonKey.includes(lower)) return engKey;
  }
  // Default to slug
  return slug(lower);
}

function mapEventStatus(matchPhase: string): EventStatus {
  switch (matchPhase) {
    case "IN_PLAY":
      return EventStatus.LIVE;
    case "FINISHED":
      return EventStatus.FINISHED;
    case "POSTPONED":
      return EventStatus.POSTPONED;
    case "CANCELLED":
      return EventStatus.CANCELLED;
    default:
      return EventStatus.SCHEDULED;
  }
}

@Injectable()
export class LeonBetFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeonBetFeedService.name);
  private state: FeedStatus = {
    configured: false,
    running: false,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastError: null,
    lastImported: 0,
    totalEvents: 0,
    totalLiveEvents: 0,
  };

  private readonly LEONBET_BASE_URL = "https://leonbet.co.tz";
  private readonly CTAG = "sw-TZ";

  private timer?: NodeJS.Timeout;

  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.state.configured = Boolean(this.config.get<string>("LEONBET_ENABLED"));
  }

  onModuleInit() {
    if (!this.state.configured) return;
    // Auto-sync every 5 minutes (Leon Bet odds change frequently)
    const minutes = Math.max(1, Number(this.config.get("LEONBET_REFRESH_MINUTES") ?? 5));
    this.timer = setInterval(
      () => void this.sync().catch((error) => this.logger.error("Leon Bet auto-sync error", error)),
      minutes * 60_000,
    );
    this.logger.log(`Leon Bet feed configured, auto-syncing every ${minutes} minutes`);
    // Do initial sync after 10 seconds
    setTimeout(() => void this.sync().catch((error) => this.logger.error("Initial Leon Bet sync error", error)), 10_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  status(): FeedStatus {
    return { ...this.state };
  }

  async sync(): Promise<FeedStatus> {
    if (this.state.running) return this.state;
    this.state.running = true;
    this.state.lastStartedAt = new Date().toISOString();
    this.state.lastError = null;

    try {
      const data = await this.fetchLeonBetData();
      const count = await this.processData(data);
      this.state.lastCompletedAt = new Date().toISOString();
      this.state.lastImported = count;
      this.state.totalEvents = data.total || 0;
      this.state.totalLiveEvents = data.liveTotal || 0;
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error("Leon Bet sync failed", this.state.lastError);
    } finally {
      this.state.running = false;
    }

    return { ...this.state };
  }

  private async fetchLeonBetData(): Promise<LeonBetResponse> {
    const fetchUrl = this.config.get<string>("LEONBET_PROXY_URL") || `${this.LEONBET_BASE_URL}/api-2/betline/headline-matches`;
    const params = new URLSearchParams({
      ctag: this.CTAG,
      flags: "reg,urlv2,orn2,cn,mm2,rrc,cmg",
      merged: "true",
    });

    this.logger.log(`Fetching from: ${fetchUrl}?${params.toString()}`);

    const response = await fetch(`${fetchUrl}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Origin: "https://leonbet.co.tz",
        Referer: "https://leonbet.co.tz/sw-tz/",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Leon Bet API returned ${response.status}: ${text.slice(0, 200)}`);
    }

    return await response.json() as Promise<LeonBetResponse>;
  }

  private async processData(data: LeonBetResponse): Promise<number> {
    const events = data.events?.events || [];
    let imported = 0;

    for (const source of events) {
      try {
        await this.syncEvent(source);
        imported++;
      } catch (error) {
        this.logger.warn(`Failed to sync event ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return imported;
  }

  private async syncEvent(source: LeonBetEvent): Promise<void> {
    const externalId = `leon-${source.id}`;
    const startsAt = new Date(source.kickoff || source.startTime || Date.now());

    // Map sport
    const sportNameStr = source.league?.sport?.name || "Football";
    const sportFamily = source.league?.sport?.family || "Soccer";

    let sport = await this.db.sport.upsert({
      where: { code: uniqueCode(sportFamily) },
      create: {
        name: sportName(sportFamily),
        slug: sportFamily.toLowerCase().replace(/\s+/g, "-"),
        code: uniqueCode(sportFamily),
        active: true,
      },
      update: { name: sportName(sportFamily), active: true },
    });

    // Map competition (league)
    const leagueName = source.league?.name || "Unknown";
    const competition = await this.db.competition.upsert({
      where: { externalId: `leon-${source.league?.id}` },
      create: {
        sportId: sport.id,
        name: leagueName,
        slug: slug(`leon-${leagueName}`),
        externalId: `leon-${source.league?.id}`,
        active: true,
      },
      update: { name: leagueName, sportId: sport.id, active: true },
    });

    // Map teams
    const homeName = source.competitors?.[0]?.name || source.name.split(" - ")[0] || "Home";
    const awayName = source.competitors?.[1]?.name || source.name.split(" - ")[1] || "Away";

    let homeTeam = await this.db.team.upsert({
      where: { slug: slug(homeName) },
      create: { name: homeName, slug: slug(homeName), shortCode: homeName.slice(0, 3).toUpperCase() },
      update: { name: homeName },
    });

    let awayTeam = await this.db.team.upsert({
      where: { slug: slug(awayName) },
      create: { name: awayName, slug: slug(awayName), shortCode: awayName.slice(0, 3).toUpperCase() },
      update: { name: awayName },
    });

    const status = mapEventStatus(source.matchPhase || "PRE_GAME");

    // Upsert event
    const event = await this.db.event.upsert({
      where: { externalId },
      create: {
        externalId,
        sportId: sport.id,
        competitionId: competition.id,
        name: `${homeName} vs ${awayName}`,
        slug: `leon-${source.id}`,
        startsAt,
        status,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeamName: homeName,
        awayTeamName: awayName,
        homeScore: source.homeScore ?? source.competitors?.[0]?.score ?? null,
        awayScore: source.awayScore ?? source.competitors?.[1]?.score ?? null,
      },
      update: {
        status,
        homeScore: source.homeScore ?? source.competitors?.[0]?.score ?? null,
        awayScore: source.awayScore ?? source.competitors?.[1]?.score ?? null,
      },
    });

    // Sync markets
    for (const [marketIdx, market] of (source.markets || []).entries()) {
      const marketKey = getMarketKey(market.name);

      let dbMarket = await this.db.market.findFirst({
        where: { eventId: event.id, key: marketKey },
      });

      if (!dbMarket) {
        dbMarket = await this.db.market.create({
          data: {
            eventId: event.id,
            key: marketKey,
            name: market.name,
            status: MarketStatus.OPEN,
            sortOrder: marketIdx,
          },
        });
      } else {
        // Update market status based on runners
        const hasOpenRunners = market.runners.some(r => r.open);
        await this.db.market.update({
          where: { id: dbMarket.id },
          data: {
            status: hasOpenRunners ? MarketStatus.OPEN : MarketStatus.SUSPENDED,
            name: market.name,
          },
        });
      }

      // Sync outcomes
      for (const [outcomeIdx, runner] of market.runners.entries()) {
        const runnerKey = runner.name === "1" ? "home" : runner.name === "X" ? "draw" : runner.name === "2" ? "away" : slug(runner.name);
        const price = runner.price / 100; // Convert cents to decimal

        const existingOutcome = await this.db.outcome.findUnique({
          where: { marketId_key: { marketId: dbMarket.id, key: runnerKey } },
        });

        const outcome = await this.db.outcome.upsert({
          where: { marketId_key: { marketId: dbMarket.id, key: runnerKey } },
          create: {
            marketId: dbMarket.id,
            key: runnerKey,
            name: runner.name === "1" ? homeName : runner.name === "X" ? "Draw" : runner.name === "2" ? awayName : runner.name,
            status: runner.open ? OutcomeStatus.ACTIVE : OutcomeStatus.SUSPENDED,
            currentOdds: price,
            sortOrder: outcomeIdx,
          },
          update: {
            name: runner.name === "1" ? homeName : runner.name === "X" ? "Draw" : runner.name === "2" ? awayName : runner.name,
            status: runner.open ? OutcomeStatus.ACTIVE : OutcomeStatus.SUSPENDED,
            currentOdds: price,
          },
        });

        // Record odds history if changed
        if (existingOutcome && Number(existingOutcome.currentOdds) !== price) {
          await this.db.odds.create({
            data: {
              outcomeId: outcome.id,
              price,
              previousPrice: existingOutcome.currentOdds,
              source: "leonbet",
            },
          });
        } else if (!existingOutcome) {
          await this.db.odds.create({
            data: {
              outcomeId: outcome.id,
              price,
              source: "leonbet",
            },
          });
        }
      }
    }
  }
}

function uniqueCode(value: string): string {
  return `ODDS_${value.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`.slice(0, 48);
}
