import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventStatus, MarketStatus, OutcomeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type OddsApiOutcome = { name: string; price: number; point?: number };
type OddsApiMarket = { key: string; outcomes: OddsApiOutcome[] };
type OddsApiBookmaker = { key: string; title: string; last_update: string; markets: OddsApiMarket[] };
type OddsApiEvent = {
  id: string; sport_key: string; sport_title?: string; commence_time: string;
  home_team: string; away_team: string; bookmakers: OddsApiBookmaker[];
};
type FeedStatus = {
  configured: boolean; running: boolean; lastStartedAt: string | null; lastCompletedAt: string | null;
  lastError: string | null; lastMatched: number; lastSkipped: number; requestsRemaining: number | null; requestsUsed: number | null;
};
type DbOutcome = { key: string; name: string; price: number };
type DbMarket = { key: string; line: number | null; name: string; outcomes: DbOutcome[]; bookmakerKey?: string };

const DEFAULT_SPORT_KEYS = [
  "soccer_epl", "soccer_efl_champ", "soccer_uefa_champs_league", "soccer_spain_la_liga", "soccer_italy_serie_a",
  "soccer_germany_bundesliga", "soccer_france_ligue_one", "soccer_uefa_europa_league",
].join(",");

const DEFAULT_MARKETS = "h2h,totals";
const DEFAULT_EXTRA_MARKETS = "btts,draw_no_bet,double_chance";

export function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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
      await this.expireStaleEvents();
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

    const match = await this.resolveEvent(source, commenceAt, homeKey, awayKey);

    const bookmaker = source.bookmakers?.[0];
    if (!bookmaker) return false;
    const marginFactor = 1 - Math.max(0, Math.min(0.25, Number(this.config.get("ODDS_API_MARGIN_PCT") ?? 0.06)));

    let dbMarkets = buildDbMarkets(source, bookmaker, marginFactor);
    if (!dbMarkets.length) return false;

    const extraBookmaker = await this.fetchExtraMarkets(source);
    if (extraBookmaker) dbMarkets = dbMarkets.concat(buildDbMarkets(source, extraBookmaker, marginFactor));

    await this.db.$transaction(async tx => {
      for (const dbMarket of dbMarkets) {
        const lineValue = dbMarket.line == null ? null : new Prisma.Decimal(dbMarket.line);
        let market = await tx.market.findFirst({ where: { eventId: match.id, key: dbMarket.key, line: lineValue } });
        market = market
          ? await tx.market.update({ where: { id: market.id }, data: { name: dbMarket.name, status: MarketStatus.OPEN, suspendedAt: null, suspensionReason: null } })
          : await tx.market.create({ data: { eventId: match.id, key: dbMarket.key, name: dbMarket.name, line: lineValue, status: MarketStatus.OPEN } });
        for (const [sortOrder, item] of dbMarket.outcomes.entries()) {
          const existing = await tx.outcome.findUnique({ where: { marketId_key: { marketId: market.id, key: item.key } } });
          const outcome = await tx.outcome.upsert({
            where: { marketId_key: { marketId: market.id, key: item.key } },
            create: { marketId: market.id, key: item.key, name: item.name, status: OutcomeStatus.ACTIVE, currentOdds: item.price, sortOrder },
            update: { name: item.name, status: OutcomeStatus.ACTIVE, currentOdds: item.price, sortOrder },
          });
          if (Number(existing?.currentOdds ?? 0) !== item.price) {
            await tx.odds.create({ data: { outcomeId: outcome.id, price: item.price, previousPrice: existing?.currentOdds, source: `odds-api:${dbMarket.bookmakerKey ?? bookmaker.key}` } });
          }
        }
      }
    });
    return true;
  }

  private async resolveEvent(source: OddsApiEvent, commenceAt: Date, homeKey: string, awayKey: string) {
    const windowStart = new Date(commenceAt.getTime() - 36 * 60 * 60_000);
    const windowEnd = new Date(commenceAt.getTime() + 36 * 60 * 60_000);
    const candidates = await this.db.event.findMany({
      where: { startsAt: { gte: windowStart, lte: windowEnd } },
      select: { id: true, homeTeamName: true, awayTeamName: true },
    });
    const matched = candidates.find(candidate =>
      teamKey(candidate.homeTeamName ?? "") === homeKey && teamKey(candidate.awayTeamName ?? "") === awayKey);
    if (matched) {
      return this.db.event.update({
        where: { id: matched.id },
        data: { startsAt: commenceAt, status: EventStatus.SCHEDULED, liveClock: null },
        select: { id: true },
      });
    }

    const metadata = sportMetadata(source.sport_key, source.sport_title);
    return this.db.$transaction(async tx => {
      const sport = await tx.sport.upsert({
        where: { slug: "football" },
        create: { slug: "football", code: "FOOTBALL", name: "Football" },
        update: { active: true },
      });
      const countrySlug = slug(metadata.country);
      const country = await tx.country.upsert({
        where: { slug: countrySlug },
        create: { sportId: sport.id, slug: countrySlug, name: metadata.country },
        update: { sportId: sport.id, name: metadata.country, active: true },
      });
      const competition = await tx.competition.upsert({
        where: { externalId: `odds-api-competition-${source.sport_key}` },
        create: { sportId: sport.id, countryId: country.id, externalId: `odds-api-competition-${source.sport_key}`, slug: `odds-api-${slug(source.sport_key)}`, name: metadata.competition },
        update: { sportId: sport.id, countryId: country.id, name: metadata.competition, active: true },
      });
      const resolveTeam = async (name: string) => {
        const existing = await tx.team.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
        if (existing) return existing;
        return tx.team.upsert({
          where: { slug: `odds-api-team-${teamKey(name)}` },
          create: { slug: `odds-api-team-${teamKey(name)}`, name, shortCode: teamCode(name) },
          update: { name, shortCode: teamCode(name) },
        });
      };
      const homeTeam = await resolveTeam(source.home_team);
      const awayTeam = await resolveTeam(source.away_team);
      return tx.event.upsert({
        where: { externalId: `odds-api-event-${source.id}` },
        create: {
          sportId: sport.id, countryId: country.id, competitionId: competition.id,
          homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
          externalId: `odds-api-event-${source.id}`, slug: `odds-api-${source.id}`,
          name: `${source.home_team} vs ${source.away_team}`, startsAt: commenceAt,
          status: EventStatus.SCHEDULED, homeTeamName: source.home_team, awayTeamName: source.away_team,
        },
        update: {
          sportId: sport.id, countryId: country.id, competitionId: competition.id,
          homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
          name: `${source.home_team} vs ${source.away_team}`, startsAt: commenceAt,
          status: EventStatus.SCHEDULED, homeTeamName: source.home_team, awayTeamName: source.away_team, liveClock: null,
        },
        select: { id: true },
      });
    });
  }

  private async expireStaleEvents() {
    const cutoff = new Date(Date.now() - 8 * 60 * 60_000);
    const stale = await this.db.event.findMany({
      where: { status: { in: [EventStatus.SCHEDULED, EventStatus.LIVE] }, startsAt: { lt: cutoff } },
      select: { id: true },
    });
    if (!stale.length) return;
    const ids = stale.map(event => event.id);
    await this.db.$transaction([
      this.db.event.updateMany({ where: { id: { in: ids } }, data: { status: EventStatus.FINISHED, liveClock: null } }),
      this.db.market.updateMany({ where: { eventId: { in: ids }, status: MarketStatus.OPEN }, data: { status: MarketStatus.SUSPENDED, suspendedAt: new Date(), suspensionReason: "Event start time has passed" } }),
    ]);
  }

  private sportKeys() {
    return String(this.config.get("ODDS_API_SPORT_KEYS") ?? DEFAULT_SPORT_KEYS).split(",").map(s => s.trim()).filter(Boolean);
  }

  private url(sportKey: string) {
    const baseUrl = this.config.get<string>("ODDS_API_BASE_URL") ?? "https://api.the-odds-api.com";
    const regions = this.config.get<string>("ODDS_API_REGIONS") ?? "eu";
    const markets = this.config.get<string>("ODDS_API_MARKETS") ?? DEFAULT_MARKETS;
    const params = new URLSearchParams({ apiKey: this.apiKey(), regions, markets, oddsFormat: "decimal" });
    return `${baseUrl.replace(/\/$/, "")}/v4/sports/${sportKey}/odds/?${params}`;
  }

  private async fetchExtraMarkets(source: OddsApiEvent): Promise<OddsApiBookmaker | null> {
    const extraMarkets = this.config.get<string>("ODDS_API_EXTRA_MARKETS") ?? DEFAULT_EXTRA_MARKETS;
    if (!extraMarkets) return null;
    try {
      const baseUrl = this.config.get<string>("ODDS_API_BASE_URL") ?? "https://api.the-odds-api.com";
      const regions = this.config.get<string>("ODDS_API_REGIONS") ?? "eu";
      const params = new URLSearchParams({ apiKey: this.apiKey(), regions, markets: extraMarkets, oddsFormat: "decimal" });
      const url = `${baseUrl.replace(/\/$/, "")}/v4/sports/${source.sport_key}/events/${source.id}/odds/?${params}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      this.readQuota(response.headers);
      if (!response.ok) return null;
      const payload = await response.json().catch(() => null) as OddsApiEvent | null;
      return payload?.bookmakers?.[0] ?? null;
    } catch (error) {
      this.logger.warn(`Extra markets fetch failed for ${source.home_team} vs ${source.away_team}: ${error instanceof Error ? error.message : error}`);
      return null;
    }
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

export function sportMetadata(key: string, providerTitle?: string) {
  const known: Record<string, { country: string; competition: string }> = {
    soccer_epl: { country: "England", competition: "Premier League" },
    soccer_efl_champ: { country: "England", competition: "Championship" },
    soccer_spain_la_liga: { country: "Spain", competition: "La Liga" },
    soccer_italy_serie_a: { country: "Italy", competition: "Serie A" },
    soccer_germany_bundesliga: { country: "Germany", competition: "Bundesliga" },
    soccer_france_ligue_one: { country: "France", competition: "Ligue 1" },
    soccer_portugal_primeira_liga: { country: "Portugal", competition: "Primeira Liga" },
    soccer_brazil_campeonato: { country: "Brazil", competition: "Serie A" },
    soccer_argentina_primera_division: { country: "Argentina", competition: "Primera Division" },
    soccer_uefa_champs_league: { country: "World", competition: "UEFA Champions League" },
    soccer_uefa_champs_league_qualification: { country: "World", competition: "UEFA Champions League" },
    soccer_uefa_europa_league: { country: "World", competition: "UEFA Europa League" },
  };
  return known[key] ?? { country: "World", competition: providerTitle?.trim() || key.replace(/^soccer_/, "").replace(/_/g, " ") };
}

export function teamCode(name: string) {
  const words = name.replace(/[^a-z0-9 ]/gi, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map(word => word[0]).join("") : name.slice(0, 3)).toUpperCase().slice(0, 5);
}

export function teamKey(name: string) {
  const normalized = slug(name).replace(/-(fc|cf|sc|afc|cd|ca|ac)$/, "").replace(/^(fc|cf|sc|afc|cd|ca|ac)-/, "");
  return normalized;
}

function buildDbMarkets(source: OddsApiEvent, bookmaker: OddsApiBookmaker, marginFactor: number): DbMarket[] {
  const results: DbMarket[] = [];
  const priced = (price: number) => shaded(price, marginFactor);

  const h2h = bookmaker.markets.find(m => m.key === "h2h");
  if (h2h) {
    const home = h2h.outcomes.find(o => o.name === source.home_team)?.price;
    const away = h2h.outcomes.find(o => o.name === source.away_team)?.price;
    const draw = h2h.outcomes.find(o => o.name.toLowerCase() === "draw")?.price;
    if (home && away) {
      results.push({
        key: "match-winner", line: null, name: "Match winner",
        outcomes: [
          { key: "home", name: source.home_team, price: priced(home) },
          ...(draw ? [{ key: "draw", name: "Draw", price: priced(draw) }] : []),
          { key: "away", name: source.away_team, price: priced(away) },
        ],
      });
    }
  }

  const btts = bookmaker.markets.find(m => m.key === "btts");
  if (btts) {
    const yes = btts.outcomes.find(o => o.name.toLowerCase() === "yes")?.price;
    const no = btts.outcomes.find(o => o.name.toLowerCase() === "no")?.price;
    if (yes && no) {
      results.push({
        key: "btts", line: null, name: "Both teams to score",
        outcomes: [{ key: "yes", name: "Yes", price: priced(yes) }, { key: "no", name: "No", price: priced(no) }],
      });
    }
  }

  const drawNoBet = bookmaker.markets.find(m => m.key === "draw_no_bet");
  if (drawNoBet) {
    const home = drawNoBet.outcomes.find(o => o.name === source.home_team)?.price;
    const away = drawNoBet.outcomes.find(o => o.name === source.away_team)?.price;
    if (home && away) {
      results.push({
        key: "draw-no-bet", line: null, name: "Draw no bet",
        outcomes: [{ key: "home", name: source.home_team, price: priced(home) }, { key: "away", name: source.away_team, price: priced(away) }],
      });
    }
  }

  const doubleChance = bookmaker.markets.find(m => m.key === "double_chance");
  if (doubleChance) {
    const outcomeFor = (label: "1X" | "12" | "X2") => doubleChance.outcomes.find(o => normalizeDoubleChance(o.name, source) === label)?.price;
    const homeOrDraw = outcomeFor("1X");
    const homeOrAway = outcomeFor("12");
    const drawOrAway = outcomeFor("X2");
    if (homeOrDraw && homeOrAway && drawOrAway) {
      results.push({
        key: "double-chance", line: null, name: "Double chance",
        outcomes: [
          { key: "home-draw", name: `${source.home_team} or Draw`, price: priced(homeOrDraw) },
          { key: "home-away", name: `${source.home_team} or ${source.away_team}`, price: priced(homeOrAway) },
          { key: "draw-away", name: `Draw or ${source.away_team}`, price: priced(drawOrAway) },
        ],
      });
    }
  }

  const totals = bookmaker.markets.find(m => m.key === "totals");
  if (totals) {
    const byPoint = new Map<number, OddsApiOutcome[]>();
    for (const outcome of totals.outcomes) {
      if (outcome.point == null) continue;
      const list = byPoint.get(outcome.point) ?? [];
      list.push(outcome);
      byPoint.set(outcome.point, list);
    }
    for (const [point, outcomes] of byPoint) {
      const over = outcomes.find(o => o.name.toLowerCase() === "over")?.price;
      const under = outcomes.find(o => o.name.toLowerCase() === "under")?.price;
      if (over && under) {
        results.push({
          key: "total-goals", line: point, name: `Over/Under ${point}`,
          outcomes: [{ key: "over", name: `Over ${point}`, price: priced(over) }, { key: "under", name: `Under ${point}`, price: priced(under) }],
        });
      }
    }
  }

  return results.map(r => ({ ...r, bookmakerKey: bookmaker.key }));
}

function normalizeDoubleChance(name: string, source: OddsApiEvent): "1X" | "12" | "X2" | null {
  const lower = name.toLowerCase();
  const home = source.home_team.toLowerCase();
  const away = source.away_team.toLowerCase();
  if (lower.includes(home) && lower.includes(away)) return "12";
  if (lower.includes(home)) return "1X";
  if (lower.includes(away)) return "X2";
  if (lower === "1x") return "1X";
  if (lower === "12") return "12";
  if (lower === "x2") return "X2";
  return null;
}
