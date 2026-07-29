import { PrismaClient, PickAccess, PickStatus, ResultStatus, RiskLevel } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function todayAt(hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
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
    create: { name: "PrimeOdds Demo", phone: "+255700000001", email: "demo@primeodds.co.tz", passwordHash: await hash("PrimeOdds123!", 12), phoneVerifiedAt: new Date() },
  });
}

main().then(() => console.log("PrimeOdds seed completed.")).catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
