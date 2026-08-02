"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "betting" | "flying" | "crashed";
type BetStatus = "idle" | "placed" | "won" | "lost";
type HistoryItem = { id: number; crash: number };

function randomCrashPoint() {
  const roll = Math.random();
  if (roll < 0.58) return 1 + Math.random() * 1.4;
  if (roll < 0.9) return 2.4 + Math.random() * 4.2;
  return 6.6 + Math.random() * 18;
}

function money(value: number) {
  return `TZS ${Math.floor(value).toLocaleString("en-US")}`;
}

export default function AviatorDemoGame({ slug, session }: { slug: string; session?: string }) {
  const [phase, setPhase] = useState<Phase>("betting");
  const [countdown, setCountdown] = useState(7);
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState(() => randomCrashPoint());
  const [stake, setStake] = useState(1000);
  const [balance, setBalance] = useState(100000);
  const [betStatus, setBetStatus] = useState<BetStatus>("idle");
  const [cashoutAt, setCashoutAt] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [round, setRound] = useState(1);
  const flightTimer = useRef<number | null>(null);

  const potentialWin = useMemo(() => stake * multiplier, [stake, multiplier]);
  const canBet = phase === "betting" && betStatus === "idle" && stake > 0 && stake <= balance;
  const canCashout = phase === "flying" && betStatus === "placed";

  useEffect(() => {
    if (phase !== "betting") return;
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          startFlight();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, round]);

  function startFlight() {
    setPhase("flying");
    setMultiplier(1);
    const started = performance.now();
    flightTimer.current = window.setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      const next = Number((1 + elapsed * 0.42 + elapsed * elapsed * 0.085).toFixed(2));
      if (next >= crashPoint) {
        if (flightTimer.current) window.clearInterval(flightTimer.current);
        setMultiplier(Number(crashPoint.toFixed(2)));
        setPhase("crashed");
        setHistory((items) => [{ id: Date.now(), crash: Number(crashPoint.toFixed(2)) }, ...items].slice(0, 12));
        setBetStatus((status) => status === "placed" ? "lost" : status);
        window.setTimeout(nextRound, 3200);
        return;
      }
      setMultiplier(next);
    }, 80);
  }

  function nextRound() {
    setPhase("betting");
    setCountdown(7);
    setMultiplier(1);
    setCrashPoint(randomCrashPoint());
    setBetStatus("idle");
    setCashoutAt(null);
    setRound((value) => value + 1);
  }

  function placeBet() {
    if (!canBet) return;
    setBalance((value) => value - stake);
    setBetStatus("placed");
  }

  function cashout() {
    if (!canCashout) return;
    const payout = Math.floor(stake * multiplier);
    setBalance((value) => value + payout);
    setCashoutAt(multiplier);
    setBetStatus("won");
  }

  return <section className="aviator-game">
    <div className="aviator-stage">
      <div className="aviator-status"><span>Round {round}</span><b>{phase === "betting" ? `Starts in ${countdown}s` : phase === "flying" ? "Flying" : "Crashed"}</b></div>
      <div className={`aviator-sky ${phase}`}>
        <div className="aviator-trail" />
        <div className="aviator-plane">A</div>
        <strong>{phase === "crashed" ? `CRASHED @ ${multiplier.toFixed(2)}x` : `${multiplier.toFixed(2)}x`}</strong>
        <small>{betStatus === "won" && cashoutAt ? `Cashed out at ${cashoutAt.toFixed(2)}x` : betStatus === "lost" ? "Demo bet lost. Try next round." : "Cash out before the crash point."}</small>
      </div>
      <div className="aviator-history">{history.length ? history.map((item) => <span className={item.crash >= 2 ? "hot" : ""} key={item.id}>{item.crash.toFixed(2)}x</span>) : <span>Round history will show here</span>}</div>
    </div>

    <aside className="aviator-panel">
      <div className="aviator-wallet"><span>Demo balance</span><b>{money(balance)}</b><small>No real MkwanjaBet wallet movement</small></div>
      <label><span>Stake</span><input type="number" min={100} step={100} value={stake} onChange={(event) => setStake(Math.max(0, Number(event.target.value) || 0))} disabled={betStatus === "placed"}/></label>
      <div className="aviator-chips">{[500, 1000, 2500, 5000].map((amount) => <button onClick={() => setStake(amount)} disabled={betStatus === "placed"} key={amount}>{amount.toLocaleString()}</button>)}</div>
      <div className="aviator-return"><span>Potential return</span><b>{money(potentialWin)}</b></div>
      {canCashout ? <button className="cashout" onClick={cashout}>Cash out {money(potentialWin)}</button> : <button onClick={placeBet} disabled={!canBet}>{betStatus === "placed" ? "Bet placed" : betStatus === "won" ? "Cashed out" : betStatus === "lost" ? "Round lost" : "Place demo bet"}</button>}
      <p>Session {session || "demo"} · {slug.replace(/-/g, " ")}</p>
    </aside>
  </section>;
}