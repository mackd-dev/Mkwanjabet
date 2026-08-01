import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventStatus, MarketStatus, OutcomeStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type ApiFootballTeam = { id: number; name: string; logo?: string | null; winner?: boolean | null };
type ApiFootballFixture = {
  fixture: { id: number; date: string; timezone?: string; status: { short: string; elapsed?: number | null }; venue?: { name?: string | null } | null };
  league: { id: number; name: string; country?: string | null; logo?: string | null; flag?: string | null; season?: number };
  teams: { home: ApiFootballTeam; away: ApiFootballTeam };
  goals: { home?: number | null; away?: number | null };
};
type ApiFootballResponse = { response?: ApiFootballFixture[]; errors?: unknown; results?: number; paging?: { current: number; total: number } };
type FeedStatus = { configured: boolean; running: boolean; lastStartedAt: string | null; lastCompletedAt: string | null; lastError: string | null; lastImported: number; requestsRemaining: number | null; requestsUsed: number | null };

@Injectable()
export class OddsFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OddsFeedService.name);
  private timer?: NodeJS.Timeout;
  private syncing?: Promise<FeedStatus>;
  private state: FeedStatus = { configured: false, running: false, lastStartedAt: null, lastCompletedAt: null, lastError: null, lastImported: 0, requestsRemaining: null, requestsUsed: null };

  constructor(private readonly db: PrismaService, private readonly config: ConfigService) {
    this.state.configured = Boolean(this.apiKey());
  }

  onModuleInit() {
    if (!this.state.configured) return;
    const minutes = Math.max(15, Number(this.config.get("API_FOOTBALL_REFRESH_MINUTES") ?? this.config.get("ODDS_API_REFRESH_MINUTES") ?? 60));
    this.timer = setInterval(() => void this.sync().catch(error => this.logger.error(error)), minutes * 60_000);
    setTimeout(() => void this.sync().catch(error => this.logger.error(error)), 5_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  status() {
    return { ...this.state };
  }

  sync() {
    if (!this.state.configured) throw new ServiceUnavailableException("API_FOOTBALL_KEY is not configured");
    if (!this.syncing) this.syncing = this.performSync().finally(() => { this.syncing = undefined; });
    return this.syncing;
  }

  private async performSync() {
    this.state.running = true;
    this.state.lastStartedAt = new Date().toISOString();
    this.state.lastError = null;
    try {
      const response = await fetch(this.url(), { headers: { "x-apisports-key": this.apiKey() }, signal: AbortSignal.timeout(20_000) });
      this.readQuota(response.headers);
      const payload = await response.json().catch(() => null) as ApiFootballResponse | null;
      if (!response.ok) throw new Error(`API-Football returned ${response.status}: ${JSON.stringify(payload?.errors ?? payload)}`);
      if (!payload || !Array.isArray(payload.response)) throw new Error("API-Football returned an unexpected response shape");
      if (payload.errors && Object.keys(payload.errors as object).length) throw new Error(`API-Football error: ${JSON.stringify(payload.errors)}`);
      let imported = 0;
      for (const fixture of payload.response) if (await this.importFixture(fixture)) imported++;
      this.state.lastImported = imported;
      this.state.lastCompletedAt = new Date().toISOString();
      return this.status();
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : "Unknown API-Football feed error";
      throw new ServiceUnavailableException(this.state.lastError);
    } finally {
      this.state.running = false;
    }
  }

  private url() {
    const baseUrl = this.config.get<string>("API_FOOTBALL_BASE_URL") ?? "https://v3.football.api-sports.io";
    const timezone = this.config.get<string>("API_FOOTBALL_TIMEZONE") ?? "Africa/Dar_es_Salaam";
    const league = this.config.get<string>("API_FOOTBALL_LEAGUE");
    const season = this.config.get<string>("API_FOOTBALL_SEASON") ?? String(new Date().getFullYear());
    const params = new URLSearchParams({ timezone });
    if (league) {
      params.set("league", league);
      params.set("season", season);
      params.set("next", this.config.get<string>("API_FOOTBALL_NEXT") ?? "50");
    } else {
      params.set("next", this.config.get<string>("API_FOOTBALL_NEXT") ?? "50");
    }
    return `${baseUrl.replace(/\/$/, "")}/fixtures?${params}`;
  }

  private apiKey() {
    return this.config.get<string>("API_FOOTBALL_KEY") ?? this.config.get<string>("APISPORTS_KEY") ?? this.config.get<string>("ODDS_API_KEY") ?? "";
  }

  private readQuota(headers: Headers) {
    const remaining = headers.get("x-ratelimit-requests-remaining") ?? headers.get("x-requests-remaining");
    const used = headers.get("x-ratelimit-requests-limit") ?? headers.get("x-requests-used");
    this.state.requestsRemaining = remaining == null ? null : Number(remaining);
    this.state.requestsUsed = used == null ? null : Number(used);
  }

  private async importFixture(source: ApiFootballFixture) {
    const startsAt = new Date(source.fixture.date);
    if (!source.fixture.id || Number.isNaN(startsAt.getTime())) return false;

    const status = eventStatus(source.fixture.status.short);
    const sportSlug = "football";
    const countryName = source.league.country?.trim() || "World";
    const countrySlug = slug(countryName);
    const competitionSlug = slug(`${source.league.name}-${source.league.id}`);
    const season = source.league.season ?? startsAt.getFullYear();
    const competitionExternalId = `api-football-league-${source.league.id}-${season}`;
    const eventExternalId = `api-football-fixture-${source.fixture.id}`;
    const homeSlug = slug(`api-football-${source.teams.home.id}-${source.teams.home.name}`);
    const awaySlug = slug(`api-football-${source.teams.away.id}-${source.teams.away.name}`);

    await this.db.$transaction(async tx => {
      const sport = await tx.sport.upsert({
        where: { slug: sportSlug },
        create: { slug: sportSlug, code: "FOOTBALL", name: "Football", iconUrl: source.league.logo ?? undefined },
        update: { active: true },
      });
      const country = await tx.country.upsert({
        where: { slug: countrySlug },
        create: { sportId: sport.id, slug: countrySlug, name: countryName, isoCode: null, flagEmoji: source.league.flag ?? null },
        update: { sportId: sport.id, name: countryName, active: true, flagEmoji: source.league.flag ?? undefined },
      });
      const competition = await tx.competition.upsert({
        where: { externalId: competitionExternalId },
        create: { sportId: sport.id, countryId: country.id, externalId: competitionExternalId, slug: competitionSlug, name: source.league.name, logoUrl: source.league.logo ?? undefined },
        update: { sportId: sport.id, countryId: country.id, name: source.league.name, logoUrl: source.league.logo ?? undefined, active: true },
      });
      const homeTeam = await tx.team.upsert({
        where: { slug: homeSlug },
        create: { slug: homeSlug, name: source.teams.home.name, shortCode: teamCode(source.teams.home.name), logoUrl: source.teams.home.logo ?? undefined },
        update: { name: source.teams.home.name, shortCode: teamCode(source.teams.home.name), logoUrl: source.teams.home.logo ?? undefined },
      });
      const awayTeam = await tx.team.upsert({
        where: { slug: awaySlug },
        create: { slug: awaySlug, name: source.teams.away.name, shortCode: teamCode(source.teams.away.name), logoUrl: source.teams.away.logo ?? undefined },
        update: { name: source.teams.away.name, shortCode: teamCode(source.teams.away.name), logoUrl: source.teams.away.logo ?? undefined },
      });
      const event = await tx.event.upsert({
        where: { externalId: eventExternalId },
        create: {
          sportId: sport.id,
          countryId: country.id,
          competitionId: competition.id,
          externalId: eventExternalId,
          slug: eventExternalId,
          name: `${source.teams.home.name} vs ${source.teams.away.name}`,
          startsAt,
          status,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeTeamName: source.teams.home.name,
          awayTeamName: source.teams.away.name,
          homeScore: source.goals.home ?? undefined,
          awayScore: source.goals.away ?? undefined,
          liveClock: source.fixture.status.elapsed == null ? undefined : `${source.fixture.status.elapsed}'`,
          venue: source.fixture.venue?.name ?? undefined,
        },
        update: {
          sportId: sport.id,
          countryId: country.id,
          competitionId: competition.id,
          name: `${source.teams.home.name} vs ${source.teams.away.name}`,
          startsAt,
          status,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeTeamName: source.teams.home.name,
          awayTeamName: source.teams.away.name,
          homeScore: source.goals.home ?? undefined,
          awayScore: source.goals.away ?? undefined,
          liveClock: source.fixture.status.elapsed == null ? undefined : `${source.fixture.status.elapsed}'`,
          venue: source.fixture.venue?.name ?? undefined,
        },
      });

      if (this.config.get<string>("API_FOOTBALL_DEMO_ODDS") === "true") {
        await this.ensureDemoMarket(tx, event.id, source);
      }
    });
    return true;
  }

  private async ensureDemoMarket(tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0], eventId: string, source: ApiFootballFixture) {
    let market = await tx.market.findFirst({ where: { eventId, key: "match-winner", line: null } });
    market = market
      ? await tx.market.update({ where: { id: market.id }, data: { name: "Match winner", status: MarketStatus.OPEN, suspendedAt: null, suspensionReason: null } })
      : await tx.market.create({ data: { eventId, key: "match-winner", name: "Match winner", status: MarketStatus.OPEN } });
    const outcomes = [
      { key: "home", name: source.teams.home.name, price: 2.1 },
      { key: "draw", name: "Draw", price: 3.1 },
      { key: "away", name: source.teams.away.name, price: 2.8 },
    ];
    for (const [sortOrder, item] of outcomes.entries()) {
      const existing = await tx.outcome.findUnique({ where: { marketId_key: { marketId: market.id, key: item.key } } });
      const outcome = await tx.outcome.upsert({
        where: { marketId_key: { marketId: market.id, key: item.key } },
        create: { marketId: market.id, key: item.key, name: item.name, status: OutcomeStatus.ACTIVE, currentOdds: item.price, sortOrder },
        update: { name: item.name, status: OutcomeStatus.ACTIVE, currentOdds: item.price, sortOrder },
      });
      if (Number(existing?.currentOdds ?? 0) !== item.price) await tx.odds.create({ data: { outcomeId: outcome.id, price: item.price, previousPrice: existing?.currentOdds, source: "api-football:demo" } });
    }
  }
}

export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sports";
}

export function uniqueCode(value: string) {
  return `ODDS_${value.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`.slice(0, 48);
}

export function sportName(key: string) {
  return ({ soccer: "Football", football: "Football", basketball: "Basketball", tennis: "Tennis", baseball: "Baseball", icehockey: "Ice Hockey", americanfootball: "American Football" } as Record<string, string>)[key.split("_")[0]] ?? "Sports";
}

export function adjustedPrice(price: number, factor: number) {
  return Math.max(1.01, Math.floor(price * factor * 100) / 100);
}

export function outcomeKey(name: string, event: { home_team?: string; away_team?: string; homeTeam?: string; awayTeam?: string }) {
  const home = event.home_team ?? event.homeTeam;
  const away = event.away_team ?? event.awayTeam;
  if (name === home) return "home";
  if (name === away) return "away";
  if (name.toLowerCase() === "draw") return "draw";
  return slug(name);
}

export function eventStatus(short: string) {
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(short)) return EventStatus.LIVE;
  if (["FT", "AET", "PEN"].includes(short)) return EventStatus.FINISHED;
  if (["PST"].includes(short)) return EventStatus.POSTPONED;
  if (["CANC", "ABD", "AWD", "WO"].includes(short)) return EventStatus.CANCELLED;
  return EventStatus.SCHEDULED;
}

export function teamCode(name: string) {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const code = words.length >= 2 ? words.slice(0, 3).map(word => word[0]).join("") : (words[0] ?? name).slice(0, 3);
  return code.toUpperCase().slice(0, 3);
}