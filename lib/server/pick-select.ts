export const publicPickInclude = {
  match: { include: { league: true, homeTeam: true, awayTeam: true } },
  factors: { orderBy: { sortOrder: "asc" as const } },
  alternatives: true,
};

export function serializePick(pick: any, premiumUnlocked = false) {
  const locked = pick.access === "PREMIUM" && !premiumUnlocked;
  return {
    id: pick.id,
    slug: pick.slug,
    title: pick.title,
    league: { name: pick.match.league.name, country: pick.match.league.country, slug: pick.match.league.slug },
    match: {
      slug: pick.match.slug,
      kickoffAt: pick.match.kickoffAt,
      status: pick.match.status,
      homeScore: pick.match.homeScore,
      awayScore: pick.match.awayScore,
      homeTeam: { name: pick.match.homeTeam.name, code: pick.match.homeTeam.shortCode, slug: pick.match.homeTeam.slug, logoUrl: pick.match.homeTeam.logoUrl },
      awayTeam: { name: pick.match.awayTeam.name, code: pick.match.awayTeam.shortCode, slug: pick.match.awayTeam.slug, logoUrl: pick.match.awayTeam.logoUrl },
    },
    market: pick.market,
    selection: locked ? null : pick.selection,
    odds: locked ? null : Number(pick.odds),
    confidence: pick.confidence,
    risk: pick.risk,
    access: pick.access,
    result: pick.result,
    featured: pick.featured,
    locked,
    shortReason: pick.shortReason,
    analysis: locked ? null : pick.analysis,
    factors: locked ? [] : pick.factors,
    alternatives: locked ? [] : pick.alternatives.map((item: any) => ({ ...item, odds: Number(item.odds) })),
    publishedAt: pick.publishedAt,
  };
}
