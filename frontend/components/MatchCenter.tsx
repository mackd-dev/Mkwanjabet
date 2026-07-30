"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api-client";

type Odd = { id: string; marketId: string; outcomeId: string; label: string; value: number };
type Group = { title: string; badge?: string; odds: Odd[] };
type Pick = Odd & { group: string; eventId: string; match: string; sport: string; league: string };
type ApiOutcome = { id: string; key: string; name: string; currentOdds: string | number | null; status: string };
type ApiMarket = { id: string; key: string; name: string; status: string; outcomes: ApiOutcome[] };
type ApiEvent = {
  id: string; slug: string; name: string; startsAt: string; status: string; venue?: string | null; liveClock?: string | null;
  homeTeamName?: string | null; awayTeamName?: string | null; homeScore?: number | null; awayScore?: number | null;
  sport?: { name: string } | null; country?: { name: string } | null; competition?: { name: string } | null;
  markets: ApiMarket[];
};

const groups: Group[] = [
  { title: "Match Result", badge: "POPULAR", odds: [{id:"demo-mr-1",marketId:"demo-match-result",outcomeId:"demo-mr-1",label:"Arsenal",value:1.84},{id:"demo-mr-x",marketId:"demo-match-result",outcomeId:"demo-mr-x",label:"Draw",value:3.55},{id:"demo-mr-2",marketId:"demo-match-result",outcomeId:"demo-mr-2",label:"Chelsea",value:4.40}] },
  { title: "Double Chance", odds: [{id:"demo-dc-1x",marketId:"demo-double-chance",outcomeId:"demo-dc-1x",label:"Arsenal or Draw",value:1.19},{id:"demo-dc-12",marketId:"demo-double-chance",outcomeId:"demo-dc-12",label:"Arsenal or Chelsea",value:1.27},{id:"demo-dc-x2",marketId:"demo-double-chance",outcomeId:"demo-dc-x2",label:"Draw or Chelsea",value:1.91}] },
  { title: "Total Goals", odds: [{id:"demo-tg-o15",marketId:"demo-total-goals",outcomeId:"demo-tg-o15",label:"Over 1.5",value:1.27},{id:"demo-tg-u15",marketId:"demo-total-goals",outcomeId:"demo-tg-u15",label:"Under 1.5",value:3.70},{id:"demo-tg-o25",marketId:"demo-total-goals",outcomeId:"demo-tg-o25",label:"Over 2.5",value:1.82},{id:"demo-tg-u25",marketId:"demo-total-goals",outcomeId:"demo-tg-u25",label:"Under 2.5",value:1.96},{id:"demo-tg-o35",marketId:"demo-total-goals",outcomeId:"demo-tg-o35",label:"Over 3.5",value:2.76},{id:"demo-tg-u35",marketId:"demo-total-goals",outcomeId:"demo-tg-u35",label:"Under 3.5",value:1.43}] },
  { title: "Both Teams To Score", odds: [{id:"demo-btts-y",marketId:"demo-btts",outcomeId:"demo-btts-y",label:"Yes",value:1.70},{id:"demo-btts-n",marketId:"demo-btts",outcomeId:"demo-btts-n",label:"No",value:2.06}] },
  { title: "First Half", odds: [{id:"demo-fh-1",marketId:"demo-first-half",outcomeId:"demo-fh-1",label:"Arsenal",value:2.34},{id:"demo-fh-x",marketId:"demo-first-half",outcomeId:"demo-fh-x",label:"Draw",value:2.18},{id:"demo-fh-2",marketId:"demo-first-half",outcomeId:"demo-fh-2",label:"Chelsea",value:4.65}] },
  { title: "Corners", odds: [{id:"demo-co-o85",marketId:"demo-corners",outcomeId:"demo-co-o85",label:"Over 8.5",value:1.74},{id:"demo-co-u85",marketId:"demo-corners",outcomeId:"demo-co-u85",label:"Under 8.5",value:2.03},{id:"demo-co-home",marketId:"demo-corners",outcomeId:"demo-co-home",label:"Arsenal most corners",value:1.58}] },
  { title: "Correct Score", odds: [{id:"demo-cs-10",marketId:"demo-correct-score",outcomeId:"demo-cs-10",label:"1-0",value:7.20},{id:"demo-cs-20",marketId:"demo-correct-score",outcomeId:"demo-cs-20",label:"2-0",value:8.80},{id:"demo-cs-21",marketId:"demo-correct-score",outcomeId:"demo-cs-21",label:"2-1",value:8.10},{id:"demo-cs-11",marketId:"demo-correct-score",outcomeId:"demo-cs-11",label:"1-1",value:6.90},{id:"demo-cs-12",marketId:"demo-correct-score",outcomeId:"demo-cs-12",label:"1-2",value:13.0},{id:"demo-cs-22",marketId:"demo-correct-score",outcomeId:"demo-cs-22",label:"2-2",value:13.5}] },
];

function shortName(name: string) {
  return name.split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase();
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function toGroups(markets: ApiMarket[]): Group[] {
  return markets.map((market, index) => ({
    title: market.name,
    badge: index === 0 ? "POPULAR" : market.status !== "OPEN" ? market.status : undefined,
    odds: market.outcomes
      .filter(outcome => outcome.status === "ACTIVE" && Number(outcome.currentOdds ?? 0) > 0)
      .map(outcome => ({ id: `${market.id}-${outcome.id}`, marketId: market.id, outcomeId: outcome.id, label: outcome.name, value: Number(outcome.currentOdds) })),
  })).filter(group => group.odds.length);
}

export default function MatchCenter({ matchId }: { matchId: string }) {
  const [tab, setTab] = useState("Markets");
  const [category, setCategory] = useState("All");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState(5000);
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [marketGroups, setMarketGroups] = useState<Group[]>(groups);
  const [notice, setNotice] = useState("");
  const totalOdds = useMemo(() => picks.reduce((a, b) => a * b.value, 1), [picks]);
  const payout = totalOdds * stake;
  const home = event?.homeTeamName ?? event?.name.split(" vs ")[0] ?? "Arsenal";
  const away = event?.awayTeamName ?? event?.name.split(" vs ")[1] ?? "Chelsea";
  const eventTime = event ? (event.status === "LIVE" ? `LIVE ${event.liveClock ?? ""}`.trim() : formatTime(event.startsAt)) : "Today · 20:00";
  const competition = event?.competition?.name ?? "Premier League";
  const country = event?.country?.name ?? "England";

  const togglePick = (group: string, odd: Odd) => {
    setPicks(current => current.some(p => p.id === odd.id)
      ? current.filter(p => p.id !== odd.id)
      : [...current.filter(p => p.marketId !== odd.marketId), { ...odd, group, eventId: event?.slug ?? matchId, match: `${home} vs ${away}`, sport: event?.sport?.name ?? "Football", league: competition }]);
  };

  useEffect(() => {
    let mounted = true;
    apiRequest<ApiEvent>(`/events/${matchId}`).then(data => {
      if (!mounted) return;
      setEvent(data);
      const next = toGroups(data.markets);
      if (next.length) setMarketGroups(next);
      setNotice("");
    }).catch(() => {
      if (mounted) setNotice("Showing demo markets while this event loads from the sportsbook API.");
    });
    return () => { mounted = false; };
  }, [matchId]);

  return <main className="mc-shell">
    <header className="mc-header">
      <Link className="sports-brand" href="/sports"><span>M</span>Mkwanja<b>Bet</b></Link>
      <nav><Link href="/sports">Sports</Link><Link href="/live">Live</Link><Link href="/jackpot">Jackpots</Link><Link href="/promotions">Promotions</Link></nav>
      <div><Link href="/login">Log in</Link><Link className="sports-register" href="/register">Register</Link></div>
    </header>

    <div className="mc-breadcrumb"><Link href="/sports">Sports</Link><span>›</span><span>{country}</span><span>›</span><span>{competition}</span><span>›</span><b>{home} vs {away}</b></div>

    <section className="mc-grid">
      <aside className="mc-left">
        <button className="active">★ Popular</button><button>⚽ Football</button><button>◉ Live</button>
        <h4>Match markets</h4>
        {["All","Popular","Goals","Corners","Cards","Players","Halves","Specials"].map(x=><button className={category===x?"active":""} onClick={()=>setCategory(x)} key={x}>{x}</button>)}
        <div className="mc-side-note"><b>18+</b><span>Bet responsibly. Set limits and never chase losses.</span></div>
      </aside>

      <section className="mc-main">
        <article className="mc-scoreboard">
          <div className="mc-league"><span>{country} · {competition}</span><button>☆ Follow match</button></div>
          <div className="mc-match-title"><div><span className="team-crest">{shortName(home)}</span><strong>{home}</strong><small>Home</small></div><section><span>{eventTime}</span><b>{event?.homeScore != null && event?.awayScore != null ? `${event.homeScore} - ${event.awayScore}` : "VS"}</b><small>{event?.venue ?? "Venue TBA"}</small></section><div><span className="team-crest alt">{shortName(away)}</span><strong>{away}</strong><small>Away</small></div></div>
          <div className="mc-status"><span>Status: {event?.status ?? "SCHEDULED"}</span><span>{event?.sport?.name ?? "Football"}</span><span>{marketGroups.length} market groups</span><span>Match ID: {matchId}</span></div>
        </article>

        <div className="mc-tabs">{["Markets","Stats","H2H","Form","Table","Lineups"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>

        {tab === "Markets" ? <>
          <div className="mc-market-tools"><div>{["All","Popular","Goals","Corners","Cards","Players"].map(x=><button className={category===x?"active":""} onClick={()=>setCategory(x)} key={x}>{x}</button>)}</div><label>⌕ <input placeholder="Search 147 markets"/></label></div>
          {notice&&<div className="sports-data-notice">{notice}</div>}
          <div className="mc-boost"><span>BOOSTED</span><div><b>{home} to win & over 1.5 goals</b><small>Display-only preview</small></div><button onClick={()=>togglePick("Boosted",{id:"boost",marketId:"boosted-preview",outcomeId:"boosted-preview-home-over-15",label:`${home} + O1.5`,value:2.45})}>2.45</button></div>
          <div className="mc-markets">{marketGroups.map(group=><article key={group.title}>
            <button className="mc-market-head" onClick={()=>setOpen(v=>({...v,[group.title]:!v[group.title]}))}><span>{group.title}{group.badge&&<i>{group.badge}</i>}</span><b>{open[group.title]?"＋":"−"}</b></button>
            {!open[group.title]&&<div className={`mc-odds ${group.odds.length===2?"two":""}`}>{group.odds.map(odd=><button className={picks.some(p=>p.id===odd.id)?"selected":""} onClick={()=>togglePick(group.title,odd)} key={odd.id}><span>{odd.label}</span><b>{odd.value.toFixed(2)}</b></button>)}</div>}
          </article>)}</div>
        </> : <div className="mc-data-panel">
          <div><b>Recent form</b><span><i>W</i><i>W</i><i>D</i><i>W</i><i>L</i></span></div>
          <div className="mc-stat"><span>Possession</span><b>58%</b><em/><b>42%</b></div>
          <div className="mc-stat"><span>Shots per match</span><b>15.8</b><em/><b>12.1</b></div>
          <div className="mc-stat"><span>Goals per match</span><b>2.1</b><em/><b>1.6</b></div>
          <p>Full live data will connect to the selected sports-data provider.</p>
        </div>}
      </section>

      <aside className="mc-slip">
        <div className="mc-slip-tabs"><button className="active">Betslip <b>{picks.length}</b></button><button>My Bets</button></div>
        {!picks.length?<div className="mc-empty"><span>▤</span><h3>Your betslip is empty</h3><p>Tap any odds to add a selection.</p></div>:<>
          <div className="mc-picks">{picks.map(p=><article key={p.id}><button onClick={()=>setPicks(x=>x.filter(v=>v.id!==p.id))}>×</button><small>{p.group}</small><strong>{p.label}</strong><span>{home} vs {away} <b>{p.value.toFixed(2)}</b></span></article>)}</div>
          <div className="mc-slip-summary"><label>Stake (TZS)<input type="number" value={stake} min="0" onChange={e=>setStake(Number(e.target.value)||0)}/></label><div>{[1000,2000,5000,10000].map(v=><button onClick={()=>setStake(v)} key={v}>+{v/1000}K</button>)}</div><p><span>Total odds</span><b>{totalOdds.toFixed(2)}</b></p><p><span>Potential payout</span><b>TZS {payout.toLocaleString("en-US",{maximumFractionDigits:0})}</b></p><button className="place-bet-btn">Log in & place bet</button><small>Final wagering activates after licensing and integrations.</small></div>
        </>}
      </aside>
    </section>
  </main>;
}
