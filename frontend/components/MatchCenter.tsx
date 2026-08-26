"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../lib/api-client";
import { authenticatedApiRequest, getCurrentUser, type SessionUser } from "../lib/session";
import { loadSlip, saveSlip, type SlipSelection } from "../lib/betslip";
import { sanitizeAmountInput } from "../lib/format";
import AuthModal from "./AuthModal";

type Odd = { id: string; marketId: string; outcomeId: string; label: string; value: number };
type Group = { title: string; category: string; badge?: string; odds: Odd[] };
type Pick = SlipSelection;
type ApiOutcome = { id: string; key: string; name: string; currentOdds: string | number | null; status: string };
type ApiMarket = { id: string; key: string; name: string; status: string; outcomes: ApiOutcome[] };
type ApiEvent = {
  id: string; slug: string; name: string; startsAt: string; status: string; venue?: string | null; liveClock?: string | null;
  homeTeamName?: string | null; awayTeamName?: string | null; homeScore?: number | null; awayScore?: number | null;
  sport?: { name: string } | null; country?: { name: string } | null; competition?: { name: string } | null;
  markets: ApiMarket[];
};

function shortName(name: string) {
  return name.split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase();
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function marketCategory(market: ApiMarket) {
  const value = `${market.key} ${market.name}`.toLowerCase();
  if (/corner|card|booking/.test(value)) return "Corners & cards";
  if (/half|h1/.test(value)) return "Half-time";
  if (/goal|score|btts|total/.test(value)) return "Goals";
  if (/match-winner|double-chance|draw-no-bet/.test(value)) return "Popular";
  return "Other";
}

function toGroups(markets: ApiMarket[]): Group[] {
  return markets.map((market, index) => ({
    title: market.name,
    category: marketCategory(market),
    badge: index === 0 ? "POPULAR" : market.status !== "OPEN" ? market.status : undefined,
    odds: market.outcomes
      .filter(outcome => outcome.status === "ACTIVE" && Number(outcome.currentOdds ?? 0) > 0)
      .map(outcome => ({ id: `${market.id}-${outcome.id}`, marketId: market.id, outcomeId: outcome.id, label: outcome.name, value: Number(outcome.currentOdds) })),
  })).filter(group => group.odds.length);
}

export default function MatchCenter({ matchId }: { matchId: string }) {
  const router = useRouter();
  const goBack = () => { if (typeof window !== "undefined" && window.history.length > 1) router.back(); else router.push("/sports"); };
  const [category, setCategory] = useState("All");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [picks, setPicks] = useState<Pick[]>(()=>loadSlip());
  useEffect(()=>{saveSlip(picks)},[picks]);
  const [stake, setStake] = useState(5000);
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [marketGroups, setMarketGroups] = useState<Group[]>([]);
  const [notice, setNotice] = useState("" );
  const [user,setUser]=useState<SessionUser|null>(null);
  const [placing,setPlacing]=useState(false);
  const [authOpen,setAuthOpen]=useState(false);
  const [authMode,setAuthMode]=useState<"login"|"register">("login");
  const openAuth=(mode:"login"|"register"="login")=>{setAuthMode(mode);setAuthOpen(true)};
  const totalOdds = useMemo(() => picks.reduce((a, b) => a * b.odds, 1), [picks]);
  const payout = totalOdds * stake;
  const home = event?.homeTeamName ?? event?.name.split(" vs ")[0] ?? "Loading";
  const away = event?.awayTeamName ?? event?.name.split(" vs ")[1] ?? "event";
  const eventTime = event ? (event.status === "LIVE" ? `LIVE ${event.liveClock ?? ""}`.trim() : formatTime(event.startsAt)) : "Loading";
  const competition = event?.competition?.name ?? "Competition";
  const country = event?.country?.name ?? "";

  const togglePick = (group: string, odd: Odd) => {
    const eventId = event?.slug ?? matchId;
    const id = `${eventId}-${odd.outcomeId}`;
    setPicks(current => current.some(p => p.id === id)
      ? current.filter(p => p.id !== id)
      : [...current.filter(p => p.eventId !== eventId && p.marketId !== odd.marketId), { id, eventId, sport: event?.sport?.name ?? "Football", league: competition, match: `${home} vs ${away}`, marketId: odd.marketId, market: group, outcomeId: odd.outcomeId, pick: odd.label, odds: odd.value }]);
  };

  useEffect(() => {
    let mounted = true;
    apiRequest<ApiEvent>(`/events/${matchId}`).then(data => {
      if (!mounted) return;
      setEvent(data);
      const next = toGroups(data.markets);
      if (next.length) {
        setMarketGroups(next);
        setOpen(Object.fromEntries(next.map((group, index) => [group.title, index < 2])));
      }
      setNotice("");
    }).catch(() => {
      if (mounted) { setMarketGroups([]); setNotice("This event is currently unavailable."); }
    });
    return () => { mounted = false; };
  }, [matchId]);

  useEffect(()=>{let mounted=true;getCurrentUser().then(current=>{if(mounted)setUser(current)}).catch(()=>{if(mounted)setUser(null)});return()=>{mounted=false}},[]);

  const categories = ["All", ...Array.from(new Set(marketGroups.map(group => group.category)))];
  const visibleGroups = category === "All" ? marketGroups : marketGroups.filter(group => group.category === category);

  const placeBet=async()=>{
    if(!user){openAuth("login");return;}
    if(!event||!picks.length)return;
    setPlacing(true);setNotice("");
    try{
      const selections=picks.map(p=>({eventId:p.eventId,sport:p.sport,league:p.league,marketId:p.marketId,outcomeId:p.outcomeId,matchName:p.match,marketName:p.market,selection:p.pick,odds:p.odds}));
      const bet=await authenticatedApiRequest<{ticketCode:string}>("/betting/place",{method:"POST",body:JSON.stringify({selections,stakeTzs:stake,acceptOddsChanges:true})});
      setPicks([]);setNotice(`Bet placed. Ticket ${bet.ticketCode}`);
    }catch(error){setNotice(error instanceof ApiError&&error.payload&&typeof error.payload==="object"&&typeof (error.payload as {message?:unknown}).message==="string"?String((error.payload as {message:string}).message):"The ticket could not be placed.");}
    finally{setPlacing(false)}
  };

  return <main className="mc-shell">
    <header className="mc-header">
      <Link className="sports-brand" href="/sports"><img src="/brand/icon/mb-mark-color.png" alt="MkwanjaBet"/><span className="sr-only">MkwanjaBet</span></Link>
      <nav><Link href="/sports">Sports</Link><Link href="/live">Live</Link><Link href="/my-bets">My bets</Link><Link href="/responsible-play">Responsible play</Link></nav>
      <div>{user?<Link className="sports-register" href="/dashboard">My account</Link>:<><button onClick={()=>openAuth("login")}>Log in</button><button className="sports-register" onClick={()=>openAuth("register")}>Register</button></>}</div>
    </header>

    <div className="mc-breadcrumb"><button className="mc-back" onClick={goBack} aria-label="Go back">‹ Back</button><Link href="/sports">Sports</Link><span>›</span><span>{country}</span><span>›</span><span>{competition}</span><span>›</span><b>{home} vs {away}</b></div>

    <section className="mc-grid">
      <aside className="mc-left"><h4>Market categories</h4>{categories.map(item=>{const count=item==="All"?marketGroups.length:marketGroups.filter(group=>group.category===item).length;return <button className={category===item?"active":""} onClick={()=>setCategory(item)} key={item}><span>{item}</span><b>{count}</b></button>})}<div className="mc-side-note"><b>18+</b><span>Bet responsibly. Set limits and never chase losses.</span></div></aside>

      <section className="mc-main">
        <article className="mc-scoreboard">
          <div className="mc-league"><span>{country} · {competition}</span><button>☆ Follow match</button></div>
          <div className="mc-match-title"><div><span className="team-crest">{shortName(home)}</span><strong>{home}</strong><small>Home</small></div><section><span>{eventTime}</span><b>{event?.homeScore != null && event?.awayScore != null ? `${event.homeScore} - ${event.awayScore}` : "VS"}</b><small>{event?.venue ?? "Venue TBA"}</small></section><div><span className="team-crest alt">{shortName(away)}</span><strong>{away}</strong><small>Away</small></div></div>
          <div className="mc-status"><span>Status: {event?.status ?? "SCHEDULED"}</span><span>{event?.sport?.name ?? "Football"}</span><span>{marketGroups.length} market groups</span><span>Match ID: {matchId}</span></div>
        </article>
        {!!marketGroups.length&&<div className="mc-market-tools"><div>{categories.map(item=><button className={category===item?"active":""} onClick={()=>setCategory(item)} key={item}>{item}</button>)}</div><span>{visibleGroups.length} markets</span></div>}
        {notice&&<div className="sports-data-notice">{notice}</div>}
        {!notice&&!marketGroups.length&&<div className="no-events"><b>No open markets</b><span>Markets may be suspended or not yet published.</span></div>}
        <div className="mc-markets">{visibleGroups.map(group=><article id={`market-${group.title.replace(/\s+/g,"-").toLowerCase()}`} key={group.title}>
          <button className="mc-market-head" aria-expanded={!!open[group.title]} onClick={()=>setOpen(v=>({...v,[group.title]:!v[group.title]}))}><span>{group.title}{group.badge&&<i>{group.badge}</i>}</span><b>{open[group.title]?"−":"＋"}</b></button>
          {open[group.title]&&<div className={`mc-odds ${group.odds.length===2?"two":""}`}>{group.odds.map(odd=><button className={picks.some(p=>p.outcomeId===odd.outcomeId&&p.eventId===(event?.slug??matchId))?"selected":""} onClick={()=>togglePick(group.title,odd)} key={odd.id}><span>{odd.label}</span><b>{odd.value.toFixed(2)}</b></button>)}</div>}
        </article>)}</div>
      </section>

      <aside className="mc-slip">
        <div className="mc-slip-tabs"><button className="active">Betslip <b>{picks.length}</b></button><Link href="/my-bets">My Bets</Link></div>
        {!picks.length?<div className="mc-empty"><span>▤</span><h3>Your betslip is empty</h3><p>Tap any odds to add a selection.</p></div>:<>
          <div className="mc-picks">{picks.map(p=><article key={p.id}><button onClick={()=>setPicks(x=>x.filter(v=>v.id!==p.id))}>×</button><small>{p.market}</small><strong>{p.pick}</strong><span>{p.match} <b>{p.odds.toFixed(2)}</b></span></article>)}</div>
          <div className="mc-slip-summary"><label>Stake (TZS)<input type="text" inputMode="numeric" value={stake||""} placeholder="0" onChange={e=>setStake(Number(sanitizeAmountInput(e.target.value))||0)}/></label><div>{[1000,2000,5000,10000].map(v=><button onClick={()=>setStake(v)} key={v}>+{v/1000}K</button>)}</div><p><span>Total odds</span><b>{totalOdds.toFixed(2)}</b></p><p><span>Potential payout</span><b>TZS {payout.toLocaleString("en-US",{maximumFractionDigits:0})}</b></p><button className="place-bet-btn" onClick={placeBet} disabled={placing}>{placing?"Placing...":user?"Place bet":"Log in & place bet"}</button><small>18+ · Stakes are deducted from your wallet when accepted.</small></div>
        </>}
      </aside>
    </section>
    <AuthModal open={authOpen} mode={authMode} onModeChange={setAuthMode} onClose={()=>setAuthOpen(false)} onSuccess={u=>{setUser(u);setAuthOpen(false)}}/>
  </main>;
}
