import { EventStatus, MarketStatus, OutcomeStatus, PickAccess, PickStatus, PrismaClient, ResultStatus, RiskLevel } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function todayAt(hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function ensureMarket(prisma: PrismaClient, data: { eventId: string; key: string; name: string; sortOrder: number; line?: number }) {
  const market = await prisma.market.findFirst({ where: { eventId: data.eventId, key: data.key, line: data.line ?? null } });
  if (market) {
    return prisma.market.update({
      where: { id: market.id },
      data: { name: data.name, sortOrder: data.sortOrder, status: MarketStatus.OPEN },
    });
  }
  return prisma.market.create({
    data: { eventId: data.eventId, key: data.key, name: data.name, sortOrder: data.sortOrder, line: data.line },
  });
}

async function ensureOutcome(prisma: PrismaClient, data: { marketId: string; key: string; name: string; odds: number; sortOrder: number }) {
  const outcome = await prisma.outcome.upsert({
    where: { marketId_key: { marketId: data.marketId, key: data.key } },
    update: { name: data.name, sortOrder: data.sortOrder, status: OutcomeStatus.ACTIVE, currentOdds: data.odds },
    create: { marketId: data.marketId, key: data.key, name: data.name, sortOrder: data.sortOrder, currentOdds: data.odds },
  });
  const oddsCount = await prisma.odds.count({ where: { outcomeId: outcome.id } });
  if (oddsCount === 0) {
    await prisma.odds.create({ data: { outcomeId: outcome.id, price: data.odds, source: "seed" } });
  }
  return outcome;
}

async function main() {
  const leagues = await Promise.all([
    prisma.league.upsert({ where: { slug: "champions-league" }, update: {}, create: { name: "Champions League", slug: "champions-league", country: "Ulaya", sortOrder: 1 } }),
    prisma.league.upsert({ where: { slug: "premier-league" }, update: {}, create: { name: "Premier League", slug: "premier-league", country: "England", sortOrder: 2 } }),
    prisma.league.upsert({ where: { slug: "nbc-premier-league" }, update: {}, create: { name: "NBC Premier League", slug: "nbc-premier-league", country: "Tanzania", sortOrder: 3 } }),
  ]);

  const [championsLeague, premierLeague, nbc] = leagues;
  const teamData = [
    ["Real Madrid", "real-madrid", "RMA", championsLeague.id], ["Bayern Munich", "bayern-munich", "BAY", championsLeague.id],
    ["Arsenal", "arsenal", "ARS", premierLeague.id], ["Chelsea", "chelsea", "CHE", premierLeague.id],
    ["Young Africans", "young-africans", "YNG", nbc.id], ["Azam FC", "azam-fc", "AZM", nbc.id],
  ] as const;
  const teams: Record<string, string> = {};
  for (const [name, slug, shortCode, leagueId] of teamData) {
    const team = await prisma.team.upsert({ where: { slug }, update: { name, shortCode, leagueId }, create: { name, slug, shortCode, leagueId } });
    teams[slug] = team.id;
  }

  const matchData = [
    { slug: "real-madrid-vs-bayern", leagueId: championsLeague.id, homeTeamId: teams["real-madrid"], awayTeamId: teams["bayern-munich"], kickoffAt: todayAt(22) },
    { slug: "arsenal-vs-chelsea", leagueId: premierLeague.id, homeTeamId: teams.arsenal, awayTeamId: teams.chelsea, kickoffAt: todayAt(20) },
    { slug: "young-africans-vs-azam", leagueId: nbc.id, homeTeamId: teams["young-africans"], awayTeamId: teams["azam-fc"], kickoffAt: todayAt(19) },
  ];
  const matches: Record<string, string> = {};
  for (const item of matchData) {
    const match = await prisma.match.upsert({ where: { slug: item.slug }, update: item, create: item });
    matches[item.slug] = match.id;
  }

  const football = await prisma.sport.upsert({
    where: { slug: "football" },
    update: { name: "Football", code: "FOOTBALL", active: true, sortOrder: 1 },
    create: { name: "Football", slug: "football", code: "FOOTBALL", active: true, sortOrder: 1 },
  });

  const sportsbookCountries = await Promise.all([
    prisma.country.upsert({
      where: { slug: "tanzania" },
      update: { sportId: football.id, name: "Tanzania", isoCode: "TZ", active: true, sortOrder: 1 },
      create: { sportId: football.id, name: "Tanzania", slug: "tanzania", isoCode: "TZ", active: true, sortOrder: 1 },
    }),
    prisma.country.upsert({
      where: { slug: "england" },
      update: { sportId: football.id, name: "England", isoCode: "GB-ENG", active: true, sortOrder: 2 },
      create: { sportId: football.id, name: "England", slug: "england", isoCode: "GB-ENG", active: true, sortOrder: 2 },
    }),
    prisma.country.upsert({
      where: { slug: "europe" },
      update: { sportId: football.id, name: "Europe", isoCode: "EU", active: true, sortOrder: 3 },
      create: { sportId: football.id, name: "Europe", slug: "europe", isoCode: "EU", active: true, sortOrder: 3 },
    }),
  ]);
  const [tanzania, england, europe] = sportsbookCountries;

  const competitions = await Promise.all([
    prisma.competition.upsert({
      where: { externalId: "seed-nbc-premier-league" },
      update: { sportId: football.id, countryId: tanzania.id, name: "NBC Premier League", slug: "nbc-premier-league", active: true, sortOrder: 1 },
      create: { sportId: football.id, countryId: tanzania.id, name: "NBC Premier League", slug: "nbc-premier-league", externalId: "seed-nbc-premier-league", active: true, sortOrder: 1 },
    }),
    prisma.competition.upsert({
      where: { externalId: "seed-premier-league" },
      update: { sportId: football.id, countryId: england.id, name: "Premier League", slug: "premier-league", active: true, sortOrder: 2 },
      create: { sportId: football.id, countryId: england.id, name: "Premier League", slug: "premier-league", externalId: "seed-premier-league", active: true, sortOrder: 2 },
    }),
    prisma.competition.upsert({
      where: { externalId: "seed-champions-league" },
      update: { sportId: football.id, countryId: europe.id, name: "Champions League", slug: "champions-league", active: true, sortOrder: 3 },
      create: { sportId: football.id, countryId: europe.id, name: "Champions League", slug: "champions-league", externalId: "seed-champions-league", active: true, sortOrder: 3 },
    }),
  ]);
  const [sportsbookNbc, sportsbookPremierLeague, sportsbookChampionsLeague] = competitions;

  const currentSeasonSlug = "2026";
  const seasons = await Promise.all(competitions.map((competition) =>
    prisma.season.upsert({
      where: { competitionId_slug: { competitionId: competition.id, slug: currentSeasonSlug } },
      update: { name: "2026 Season", current: true, active: true },
      create: { competitionId: competition.id, name: "2026 Season", slug: currentSeasonSlug, current: true, active: true },
    }),
  ));
  const [nbcSeason, premierLeagueSeason, championsLeagueSeason] = seasons;

  const eventData = [
    {
      slug: "young-africans-vs-azam-sportsbook",
      name: "Young Africans vs Azam FC",
      countryId: tanzania.id,
      competitionId: sportsbookNbc.id,
      seasonId: nbcSeason.id,
      homeTeamId: teams["young-africans"],
      awayTeamId: teams["azam-fc"],
      homeTeamName: "Young Africans",
      awayTeamName: "Azam FC",
      startsAt: todayAt(19),
      status: EventStatus.SCHEDULED,
    },
    {
      slug: "arsenal-vs-chelsea-sportsbook",
      name: "Arsenal vs Chelsea",
      countryId: england.id,
      competitionId: sportsbookPremierLeague.id,
      seasonId: premierLeagueSeason.id,
      homeTeamId: teams.arsenal,
      awayTeamId: teams.chelsea,
      homeTeamName: "Arsenal",
      awayTeamName: "Chelsea",
      startsAt: todayAt(20),
      status: EventStatus.SCHEDULED,
    },
    {
      slug: "real-madrid-vs-bayern-sportsbook",
      name: "Real Madrid vs Bayern Munich",
      countryId: europe.id,
      competitionId: sportsbookChampionsLeague.id,
      seasonId: championsLeagueSeason.id,
      homeTeamId: teams["real-madrid"],
      awayTeamId: teams["bayern-munich"],
      homeTeamName: "Real Madrid",
      awayTeamName: "Bayern Munich",
      startsAt: todayAt(22),
      status: EventStatus.LIVE,
      liveClock: "23:14",
    },
  ];

  for (const data of eventData) {
    const event = await prisma.event.upsert({
      where: { slug: data.slug },
      update: { ...data, sportId: football.id },
      create: { ...data, sportId: football.id },
    });
    const matchWinner = await ensureMarket(prisma, { eventId: event.id, key: "match-winner", name: "Match Winner", sortOrder: 1 });
    await ensureOutcome(prisma, { marketId: matchWinner.id, key: "home", name: data.homeTeamName, odds: 2.05, sortOrder: 1 });
    await ensureOutcome(prisma, { marketId: matchWinner.id, key: "draw", name: "Draw", odds: 3.25, sortOrder: 2 });
    await ensureOutcome(prisma, { marketId: matchWinner.id, key: "away", name: data.awayTeamName, odds: 3.7, sortOrder: 3 });

    const totals = await ensureMarket(prisma, { eventId: event.id, key: "total-goals", name: "Total Goals 2.5", sortOrder: 2, line: 2.5 });
    await ensureOutcome(prisma, { marketId: totals.id, key: "over-2-5", name: "Over 2.5", odds: 1.92, sortOrder: 1 });
    await ensureOutcome(prisma, { marketId: totals.id, key: "under-2-5", name: "Under 2.5", odds: 1.88, sortOrder: 2 });

    const btts = await ensureMarket(prisma, { eventId: event.id, key: "both-teams-to-score", name: "Both Teams To Score", sortOrder: 3 });
    await ensureOutcome(prisma, { marketId: btts.id, key: "yes", name: "Yes", odds: 1.78, sortOrder: 1 });
    await ensureOutcome(prisma, { marketId: btts.id, key: "no", name: "No", odds: 2.02, sortOrder: 2 });
  }

  const picks = [
    { matchSlug: "real-madrid-vs-bayern", slug: "real-madrid-vs-bayern-btts", title: "Pick ya Siku", market: "Timu zote kufunga", selection: "Ndiyo", odds: 1.67, confidence: 91, risk: RiskLevel.LOW, access: PickAccess.PREMIUM, featured: true, analysis: "Timu zote mbili zina ubora mkubwa wa kushambulia na zimeonyesha mwenendo mzuri wa kufunga katika mechi zao za karibuni.", shortReason: "Form nzuri ya ushambuliaji kwa timu zote mbili." },
    { matchSlug: "arsenal-vs-chelsea", slug: "arsenal-vs-chelsea-over-15", title: "Pick ya Bure", market: "Jumla ya magoli", selection: "Zaidi ya 1.5", odds: 1.42, confidence: 94, risk: RiskLevel.LOW, access: PickAccess.FREE, featured: false, analysis: "Rekodi za karibuni zinaonyesha uwezekano mkubwa wa mechi kufikisha angalau magoli mawili.", shortReason: "Mwenendo wa magoli unaunga mkono Over 1.5." },
    { matchSlug: "young-africans-vs-azam", slug: "young-africans-vs-azam-over-15", title: "Pick ya Bure", market: "Jumla ya magoli", selection: "Zaidi ya 1.5", odds: 1.51, confidence: 88, risk: RiskLevel.MEDIUM, access: PickAccess.FREE, featured: false, analysis: "Ubora wa vikosi na historia ya mashambulizi inatoa nafasi ya kuona magoli mawili au zaidi.", shortReason: "Timu zote zina uwezo wa kutengeneza nafasi." },
  ];
  for (const item of picks) {
    const { matchSlug, ...data } = item;
    await prisma.pick.upsert({
      where: { slug: data.slug },
      update: { ...data, odds: data.odds, matchId: matches[matchSlug], status: PickStatus.PUBLISHED, result: ResultStatus.PENDING, publishedAt: new Date() },
      create: { ...data, odds: data.odds, matchId: matches[matchSlug], status: PickStatus.PUBLISHED, result: ResultStatus.PENDING, publishedAt: new Date(), factors: { create: [{ label: "Form ya karibuni", score: data.confidence, detail: "Mwenendo wa mechi za mwisho." }, { label: "Nguvu ya ushambuliaji", score: Math.max(data.confidence - 3, 70), detail: "Uwezo wa kutengeneza nafasi na kufunga." }] } },
    });
  }

  await Promise.all([
    prisma.plan.upsert({ where: { slug: "daily" }, update: {}, create: { name: "Siku 1", slug: "daily", priceTzs: 2000, durationDays: 1, features: ["Picks zote za Premium", "Uchambuzi kamili"], sortOrder: 1 } }),
    prisma.plan.upsert({ where: { slug: "weekly" }, update: {}, create: { name: "Wiki 1", slug: "weekly", priceTzs: 7000, durationDays: 7, popular: true, features: ["Picks zote za Premium", "Uchambuzi kamili", "Arifa za picks mpya"], sortOrder: 2 } }),
    prisma.plan.upsert({ where: { slug: "monthly" }, update: {}, create: { name: "Mwezi 1", slug: "monthly", priceTzs: 20000, durationDays: 30, features: ["Picks zote za Premium", "Uchambuzi kamili", "Arifa", "Historia yote"], sortOrder: 3 } }),
  ]);

  await prisma.user.upsert({
    where: { phone: "+255700000001" },
    update: {},
    create: { name: "MkwanjaBet Demo", phone: "+255700000001", email: "demo@mkwanjabet.co.tz", passwordHash: await hash("MkwanjaBet123!", 12), phoneVerifiedAt: new Date() },
  });
}

main().then(() => console.log("MkwanjaBet seed completed.")).catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
