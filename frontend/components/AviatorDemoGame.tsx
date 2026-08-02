"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api-client";

type Phase = "BETTING" | "FLYING" | "CRASHED";
type RoundView = { id: string; roundNumber: number; phase: Phase; multiplier: number; serverSeedHash: string; clientSeed: string; nonce: number; startsAt: string; bettingClosesAt: string; crashedAt: string | null; crashPoint: number | null };
type SessionView = { id: string; providerSessionId: string; playMoneyBalanceTzs: number };
type BetView = { id: string; stakeTzs: number; status: string; cashoutMultiplier: number | null; payoutTzs: number | null };
type CurrentResponse = { success: boolean; round: RoundView; session: SessionView | null; bet: BetView | null; history: { id: string; crash: number; roundNumber: number }[] };

function money(value: number) { return `TZS ${Math.floor(value).toLocaleString("en-US")}`; }

export default function AviatorDemoGame({ slug, session }: { slug: string; session?: string }) {
  const [round, setRound] = useState<RoundView | null>(null);
  const [demoSession, setDemoSession] = useState<SessionView | null>(null);
  const [bet, setBet] = useState<BetView | null>(null);
  const [history, setHistory] = useState<CurrentResponse["history"]>([]);
  const [stake, setStake] = useState(1000);
  const [notice, setNotice] = useState("Server-controlled demo round loading...");
  const [busy, setBusy] = useState(false);

  const potentialWin = useMemo(() => stake * (round?.multiplier ?? 1), [stake, round?.multiplier]);
  const countdown = round ? Math.max(0, Math.ceil((new Date(round.bettingClosesAt).getTime() - Date.now()) / 1000)) : 0;
  const canBet = !!session && round?.phase === "BETTING" && !bet && stake > 0 && stake <= (demoSession?.playMoneyBalanceTzs ?? 0);
  const canCashout = !!session && round?.phase === "FLYING" && bet?.status === "PLACED";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const query = session ? `?session=${encodeURIComponent(session)}` : "";
        const response = await apiRequest<CurrentResponse>(`/casino/aviator/current${query}`);
        if (cancelled) return;
        setRound(response.round); setDemoSession(response.session); setBet(response.bet); setHistory(response.history);
        setNotice(response.session ? "Demo mode: server controls rounds, multiplier, bets, and cashout." : "Launch Aviator from /games to create a demo session.");
      } catch { if (!cancelled) setNotice("Aviator demo engine is not reachable right now."); }
    }
    load();
    const timer = window.setInterval(load, 650);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session]);

  async function placeBet() {
    if (!canBet || !session) return;
    setBusy(true);
    try {
      const response = await apiRequest<CurrentResponse>("/casino/aviator/bet", { method: "POST", body: JSON.stringify({ session, stakeTzs: stake }) });
      setRound(response.round); setDemoSession(response.session); setBet(response.bet); setNotice("Demo bet accepted by server.");
    } catch (error) { setNotice("Could not place that demo bet. Wait for the next round or check balance."); }
    finally { setBusy(false); }
  }

  async function cashout() {
    if (!canCashout || !session) return;
    setBusy(true);
    try {
      const response = await apiRequest<CurrentResponse>("/casino/aviator/cashout", { method: "POST", body: JSON.stringify({ session }) });
      setRound(response.round); setDemoSession(response.session); setBet(response.bet); setNotice("Server accepted cashout.");
    } catch { setNotice("Cashout missed or is no longer available for this round."); }
    finally { setBusy(false); }
  }

  return <section className="aviator-game">
    <div className="aviator-stage">
      <div className="aviator-status"><span>Round {round?.roundNumber ?? "..."}</span><b>{round?.phase === "BETTING" ? `Starts in ${countdown}s` : round?.phase === "FLYING" ? "Flying" : "Crashed"}</b></div>
      <div className={`aviator-sky ${(round?.phase ?? "BETTING").toLowerCase()}`}>
        <div className="aviator-trail" />
        <div className="aviator-plane">A</div>
        <strong>{round?.phase === "CRASHED" ? `CRASHED @ ${(round.crashPoint ?? round.multiplier).toFixed(2)}x` : `${(round?.multiplier ?? 1).toFixed(2)}x`}</strong>
        <small>{bet?.status === "CASHED_OUT" ? `Cashed out at ${bet.cashoutMultiplier?.toFixed(2)}x for ${money(bet.payoutTzs ?? 0)}` : bet?.status === "LOST" ? "Server settled this demo bet as lost." : bet?.status === "PLACED" ? "Demo bet active. Cash out before crash." : notice}</small>
      </div>
      <div className="aviator-history">{history.length ? history.map((item) => <span className={item.crash >= 2 ? "hot" : ""} key={item.id}>{item.crash.toFixed(2)}x</span>) : <span>Round history will show here</span>}</div>
    </div>

    <aside className="aviator-panel">
      <div className="aviator-wallet"><span>Demo balance</span><b>{money(demoSession?.playMoneyBalanceTzs ?? 0)}</b><small>No real MkwanjaBet wallet movement</small></div>
      <label><span>Stake</span><input type="number" min={100} step={100} value={stake} onChange={(event) => setStake(Math.max(0, Number(event.target.value) || 0))} disabled={!!bet && bet.status === "PLACED"}/></label>
      <div className="aviator-chips">{[500, 1000, 2500, 5000].map((amount) => <button onClick={() => setStake(amount)} disabled={!!bet && bet.status === "PLACED"} key={amount}>{amount.toLocaleString()}</button>)}</div>
      <div className="aviator-return"><span>Potential return</span><b>{money(potentialWin)}</b></div>
      {canCashout ? <button className="cashout" onClick={cashout} disabled={busy}>Cash out {money(potentialWin)}</button> : <button onClick={placeBet} disabled={!canBet || busy}>{bet?.status === "PLACED" ? "Bet placed" : bet?.status === "CASHED_OUT" ? "Cashed out" : bet?.status === "LOST" ? "Round lost" : "Place demo bet"}</button>}
      <p>Session {session || "missing"} · {slug.replace(/-/g, " ")} · Hash {round?.serverSeedHash.slice(0, 12) ?? "..."}</p>
    </aside>
  </section>;
}