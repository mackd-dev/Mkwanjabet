export type SlipSelection = {
  id: string;
  eventId: string;
  sport: string;
  league: string;
  match: string;
  marketId: string;
  market: string;
  outcomeId: string;
  pick: string;
  odds: number;
};

const SLIP_KEY = "mkwanjabet_slip_v1";

export function loadSlip(): SlipSelection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SLIP_KEY);
    return raw ? (JSON.parse(raw) as SlipSelection[]) : [];
  } catch {
    return [];
  }
}

export function saveSlip(items: SlipSelection[]) {
  if (typeof window === "undefined") return;
  try {
    if (items.length) localStorage.setItem(SLIP_KEY, JSON.stringify(items));
    else localStorage.removeItem(SLIP_KEY);
  } catch {
    // storage unavailable (private browsing, quota) - selections just won't persist
  }
}
