/**
 * Leon Bet Odds Sync Script
 * 
 * This script fetches odds data from Leon Bet and syncs it to the database.
 * 
 * IMPORTANT: Leon Bet's API validates TLS fingerprints, so direct fetch from
 * Node.js will fail with INVALID_CODE. This script works when:
 * 1. Run behind a proxy that spoofs browser TLS (e.g., curl-impersonate)
 * 2. Run from a browser context (e.g., Puppeteer page.evaluate)
 * 3. Leon Bet has relaxed their protection
 * 
 * For production, use the NestJS module with a Puppeteer proxy.
 */

import { PrismaClient, EventStatus, MarketStatus, OutcomeStatus } from "@prisma/client";

const LEONBET_BASE_URL = "https://leonbet.co.tz";
const CTAG = "sw-TZ";

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
  if (MARKET_KEY_MAP[lower]) return MARKET_KEY_MAP[lower];
  for (const [leonKey, engKey] of Object.entries(MARKET_KEY_MAP)) {
    if (lower.includes(leonKey) || leonKey.includes(lower)) return engKey;
  }
  return lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "match-winner";
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sports";
}

function uniqueCode(value: string): string {
  return `ODDS_${value.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`.slice(0, 48);
}

function sportName(key: string): string {
  return ({ soccer: "Football", football: "Football", basketball: "Basketball", tennis: "Tennis", baseball: "Baseball", icehockey: "Ice Hockey", americanfootball: "American Football" } as Record<string, string>)[key.split("_")[0]] ?? "Sports";
}

function mapEventStatus(matchPhase: string): EventStatus {
  switch (matchPhase) {
    case "IN_PLAY": return EventStatus.LIVE;
    case "FINISHED": return EventStatus.FINISHED;
    case "POSTPONED": return EventStatus.POSTPONED;
    case "CANCELLED": return EventStatus.CANCELLED;
    default: return EventStatus.SCHEDULED;
  }
}

async function fetchLeonBetData(): Promise<any> {
  const url = `${LEONBET_BASE_URL}/api-2/betline/headline-matches?ctag=${CTAG}&flags=reg,urlv2,orn2,cn,mm2,rrc,cmg&merged=true`;
  
  console.log(`Fetching: ${url}`);
  
  const response = await fetch(url, {
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
    throw new Error(`Leon Bet API returned ${response.status}: ${text.slice(0, 300)}`);
  }

  return await response.json();
}

async function syncEvent(prisma: PrismaClient, source: any): Promise<void> {
  const externalId = `leon-${source.id}`;
  const startsAt = new Date(source.kickoff || source.startTime || Date.now());

  // Map sport
  const sportFamily = source.league?.sport?.family || "Soccer";
  const sport = await prisma.sport.upsert({
    where: { code: uniqueCode(sportFamily) },
    create: { name: sportName(sportFamily), slug: sportFamily.toLowerCase().replace(/\s+/g, "-"), code: uniqueCode(sportFamily), active: true },
    update: { name: sportName(sportFamily), active: true },
  });

  // Map competition
  const leagueName = source.league?.name || "Unknown";
  const competition = await prisma.competition.upsert({
    where: { externalId: `leon-${source.league?.id}` },
    create: { sportId: sport.id, name: leagueName, slug: slug(`leon-${leagueName}`), externalId: `leon-${source.league?.id}`, active: true },
    update: { name: leagueName, sportId: sport.id, active: true },
  });

  // Map teams
  const homeName = source.competitors?.[0]?.name || source.name.split(" - ")[0] || "Home";
  const awayName = source.competitors?.[1]?.name || source.name.split(" - ")[1] || "Away";

  const homeTeam = await prisma.team.upsert({
    where: { slug: slug(homeName) },
    create: { name: homeName, slug: slug(homeName), shortCode: homeName.slice(0, 3).toUpperCase() },
    update: { name: homeName },
  });

  const awayTeam = await prisma.team.upsert({
    where: { slug: slug(awayName) },
    create: { name: awayName, slug: slug(awayName), shortCode: awayName.slice(0, 3).toUpperCase() },
    update: { name: awayName },
  });

  const status = mapEventStatus(source.matchPhase || "PRE_GAME");

  // Upsert event
  const event = await prisma.event.upsert({
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

    let dbMarket = await prisma.market.findUnique({
      where: { eventId_key_line: { eventId: event.id, key: marketKey, line: undefined as any } },
    });

    if (!dbMarket) {
      dbMarket = await prisma.market.create({
        data: { eventId: event.id, key: marketKey, name: market.name, status: MarketStatus.OPEN, sortOrder: marketIdx },
      });
    } else {
      const hasOpenRunners = market.runners.some((r: any) => r.open);
      await prisma.market.update({
        where: { id: dbMarket.id },
        data: { status: hasOpenRunners ? MarketStatus.OPEN : MarketStatus.SUSPENDED, name: market.name },
      });
    }

    // Sync outcomes
    for (const [outcomeIdx, runner] of market.runners.entries()) {
      const runnerKey = runner.name === "1" ? "home" : runner.name === "X" ? "draw" : runner.name === "2" ? "away" : slug(runner.name);
      const price = runner.price / 100; // Convert cents to decimal

      const existingOutcome = await prisma.outcome.findUnique({
        where: { marketId_key: { marketId: dbMarket.id, key: runnerKey } },
      });

      const outcome = await prisma.outcome.upsert({
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

      // Record odds history
      if (existingOutcome && Number(existingOutcome.currentOdds) !== price) {
        await prisma.odds.create({
          data: { outcomeId: outcome.id, price, previousPrice: existingOutcome.currentOdds, source: "leonbet" },
        });
      } else if (!existingOutcome) {
        await prisma.odds.create({
          data: { outcomeId: outcome.id, price, source: "leonbet" },
        });
      }
    }
  }
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Starting Leon Bet sync...");
    const data = await fetchLeonBetData();
    const events = data.events?.events || [];
    console.log(`Found ${events.length} events (${data.liveTotal || 0} live)`);

    let imported = 0;
    let failed = 0;

    for (const source of events) {
      try {
        await syncEvent(prisma, source);
        imported++;
      } catch (error) {
        failed++;
        console.error(`Failed event ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`Sync complete: ${imported} imported, ${failed} failed`);
  } catch (error) {
    console.error("Sync failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
