/**
 * Leon Bet Client - Browser-based data fetcher
 * 
 * This module fetches odds data from Leon Bet directly from the user's browser.
 * Leon Bet's API blocks server-side requests (TLS fingerprint validation) but
 * works from real browsers.
 * 
 * USAGE: This is meant to be used as a reference/proxy pattern.
 * For production, use the NestJS module with a Puppeteer proxy.
 */

const LEONBET_BASE_URL = "https://leonbet.co.tz";
const CTAG = "sw-TZ";

export type LeonBetRunner = {
  id: number;
  name: string;
  price: number; // cents - divide by 100 for decimal odds
  open: boolean;
};

export type LeonBetMarket = {
  id: number;
  name: string;
  runners: LeonBetRunner[];
};

export type LeonBetEvent = {
  id: number;
  name: string;
  kickoff: number;
  matchPhase: string;
  homeScore?: number | null;
  awayScore?: number | null;
  league?: { id: number; name: string; sport?: { id: number; name: string; family?: string } };
  competitors?: { id: number; name: string; score?: number | null }[];
  markets?: LeonBetMarket[];
};

export type LeonBetResponse = {
  total?: number;
  liveTotal?: number;
  events?: {
    events?: LeonBetEvent[];
  };
};

export async function fetchLeonBetMatches(): Promise<LeonBetResponse> {
  const url = `${LEONBET_BASE_URL}/api-2/betline/headline-matches?ctag=${CTAG}&flags=reg,urlv2,orn2,cn,mm2,rrc,cmg&merged=true`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Origin: "https://leonbet.co.tz",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Leon Bet API returned ${response.status}`);
  }

  return await response.json() as Promise<LeonBetResponse>;
}

export async function fetchLeonBetSports(): Promise<any> {
  const url = `${LEONBET_BASE_URL}/api-2/betline/sports?ctag=${CTAG}&flags=urlv2`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Origin: "https://leonbet.co.tz",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Leon Bet API returned ${response.status}`);
  }

  return await response.json();
}

export function convertOdds(priceCents: number): number {
  return priceCents / 100;
}

export function mapMarketKey(leonName: string): string {
  const lower = leonName.toLowerCase().trim();
  const map: Record<string, string> = {
    "mshindi": "match-winner",
    "jumla": "total",
    "jumla ya magoli": "total",
    "handicap": "handicap",
    "timu zote kufunga": "both-teams-score",
    "kipindi cha 1: mshindi": "first-half-winner",
    "double chance": "double-chance",
  };

  if (map[lower]) return map[lower];
  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) return value;
  }
  return lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "match-winner";
}
