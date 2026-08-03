"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Market = { label: string; odds: number };
type Event = {
  id: string; sport: string; country: string; league: string; time: string; minute?: string;
  home: string; away: string; score?: string; markets: Market[]; more: number; live?: boolean;
};
type Selection = { id: string; eventId: string; match: string; market: string; pick: string; odds: number };

const events: Event[] = [
  {id:"ars-che",sport:"Football",country:"England",league:"Premier League",time:"20:00",home:"Arsenal",away:"Chelsea",markets:[{label:"1",odds:1.84},{label:"X",odds:3.55},{label:"2",odds:4.40}],more:96},
  {id:"bar-atm",sport:"Football",country:"Spain",league:"La Liga",time:"22:00",home:"Barcelona",away:"Atlético Madrid",markets:[{label:"1",odds:1.72},{label:"X",odds:3.90},{label:"2",odds:4.95}],more:104},
  {id:"int-juv",sport:"Football",country:"Italy",league:"Serie A",time:"21:45",home:"Inter Milan",away:"Juventus",markets:[{label:"1",odds:2.02},{label:"X",odds:3.25},{label:"2",odds:3.85}],more:88},
  {id:"bay-bvb",sport:"Football",country:"Germany",league:"Bundesliga",time:"19:30",home:"Bayern Munich",away:"Dortmund",markets:[{label:"1",odds:1.58},{label:"X",odds:4.30},{label:"2",odds:5.20}],more:91},
  {id:"liv-new",sport:"Football",country:"England",league:"Premier League",time:"LIVE",minute:"63'",home:"Liverpool",away:"Newcastle",score:"2 - 1",markets:[{label:"1",odds:1.31},{label:"X",odds:4.80},{label:"2",odds:12.0}],more:54,live:true},
  {id:"lal-bos",sport:"Basketball",country:"USA",league:"NBA",time:"LIVE",minute:"Q3 06:14",home:"LA Lakers",away:"Boston Celtics",score:"71 - 68",markets:[{label:"1",odds:1.76},{label:"2",odds:2.08},{label:"O 219.5",odds:1.91}],more:38,live:true},
];

const sports = [
  ["Football","⚽",42],["Basketball","🏀",18],["Tennis","🎾",26],["Volleyball","🏐",12],["Ice Hockey","◉",8],["Table Tennis","◌",31]
] as const;

export default function SportsHub(){
  const [tab,setTab]=useState<"prematch"|"live">("prematch");
  const [sport,setSport]=useState("Football");
  const [query,setQuery]=useState("");
  const [slip,setSlip]=useState<Selection[]>([]);
  const [stake,setStake]=useState(5000);
  const [mobileSlip,setMobileSlip]=useState(false);
  const [oddsAccepted,setOddsAccepted]=useState(true);

  const visible=events.filter(e=>{
    const tabMatch=tab==="live" ? e.live : !e.live;
    const sportMatch=e.sport===sport;
    const q=`${e.home} ${e.away} ${e.league} ${e.country}`.toLowerCase();
    return tabMatch && sportMatch && q.includes(query.toLowerCase());
  });
  const totalOdds=useMemo(()=>slip.reduce((n,s)=>n*s.odds,1),[slip]);
  const potential=stake*totalOdds;

  const toggle=(e:Event,m:Market)=>{
    const id=`${e.id}-${m.label}`;
    const next={id,eventId:e.id,match:`${e.home} vs ${e.away}`,market:"Match result",pick:m.label,odds:m.odds};
    setSlip(x=>x.some(s=>s.id===id)?x.filter(s=>s.id!==id):[...x.filter(s=>s.eventId!==e.id),next]);
  };

  const BetSlip = ({mobile=false}:{mobile?:boolean}) => <aside className={`betslip ${mobile?"mobile-slip-panel":""}`}>
    {mobile && <button className="slip-close" onClick={()=>setMobileSlip(false)}>×</button>}
    <div className="betslip-tabs"><button className="active">Betslip <b>{slip.length}</b></button><button>My Bets</button></div>
    {!slip.length?<div className="empty-slip"><span>＋</span><h3>Your betslip is empty</h3><p>Select odds from any event to build your ticket.</p><div><b>Booking code</b><div className="booking-row"><input placeholder="Enter booking code"/><button>Load</button></div></div></div>:<>
      <div className="slip-topline"><span>Accumulator</span><button onClick={()=>setSlip([])}>Clear all</button></div>
      <div className="slip-items">{slip.map(s=><article key={s.id}><button aria-label="Remove selection" onClick={()=>setSlip(x=>x.filter(v=>v.id!==s.id))}>×</button><small>{s.market}</small><strong>{s.pick} · {s.match}</strong><div><span>Odds</span><b>{s.odds.toFixed(2)}</b></div></article>)}</div>
      <div className="slip-summary">
        <label>Stake (TZS)<input type="number" min="0" value={stake} onChange={e=>setStake(Number(e.target.value)||0)}/></label>
        <div className="quick-stakes">{[1000,2000,5000,10000].map(v=><button key={v} onClick={()=>setStake(v)}>+{v/1000}K</button>)}</div>
        <p><span>Total odds</span><b>{totalOdds.toFixed(2)}</b></p><p><span>Potential payout</span><b>TZS {potential.toLocaleString("en-US",{maximumFractionDigits:0})}</b></p>
        <label className="odds-change"><input type="checkbox" checked={oddsAccepted} onChange={e=>setOddsAccepted(e.target.checked)}/> Accept odds changes</label>
        <button className="place-bet-btn" disabled={!stake || !oddsAccepted}>Log in & place bet</button>
        <small>18+ · Play responsibly. Final wagering will be enabled after licensing and production integrations.</small>
      </div>
    </>}
  </aside>;

  return <main className="sports-shell">
    <header className="sports-topbar">
      <Link className="sports-brand" href="/"><span>M</span>Mkwanja<b>Bet</b></Link>
      <nav><Link className="active" href="/sports">Sports</Link><Link href="/live">Live</Link><Link href="/jackpot">Jackpots</Link><Link href="/promotions">Promotions</Link></nav>
      <div className="sports-actions"><button className="wallet-preview"><small>Balance</small><b>TZS 0.00</b></button><Link href="/login">Log in</Link><Link className="sports-register" href="/register">Register</Link></div>
    </header>
    <div className="sports-mainnav">
      {["Sports","Live","Jackpots","Aviator","Livescore","Results","Promotions"].map((x,i)=><button key={x} className={i===0?"active":""}>{x}{x==="Live"&&<i/>}</button>)}
    </div>
    <section className="ticker"><b>🔥 TRENDING</b><span>Premier League</span><span>Champions League</span><span>NBA</span><span>Jackpot</span><span>Today’s boosted odds</span></section>
    <section className="sports-layout">
      <aside className="sports-left">
        <h3>Sports</h3>
        {sports.map(([name,icon,count])=><button key={name} onClick={()=>setSport(name)} className={sport===name?"active":""}><span>{icon}</span>{name}<small>{count}</small></button>)}
        <h3>Popular competitions</h3>
        {["Premier League","UEFA Champions League","La Liga","Serie A","Bundesliga","CAF Champions League"].map(x=><button key={x}><span>☆</span>{x}</button>)}
        <div className="sidebar-help"><b>Need help?</b><p>Visit support or learn about responsible play.</p><Link href="/contact">Support centre</Link></div>
      </aside>
      <section className="sports-content">
        <div className="sports-hero"><div><span>MKWANJABET SPORTSBOOK</span><h1>Big matches.<br/>Bigger possibilities.</h1><p>A fast, mobile-first sportsbook experience built for Tanzania — with clear markets, quick tickets and local payments ready for integration.</p><div className="hero-actions-mini"><button>Explore top games</button><button>How to play</button></div></div><div className="hero-jackpot"><small>WEEKLY JACKPOT</small><b>TZS 50,000,000</b><span>Predict 15 matches</span><Link href="/jackpot">Play jackpot →</Link></div></div>
        <div className="promo-cards"><article><span>BOOST</span><b>Enhanced odds</b><small>Selected top matches</small></article><article><span>NEW</span><b>Early payout</b><small>Eligible football bets</small></article><article><span>FAST</span><b>Instant booking</b><small>Save and share tickets</small></article></div>
        <div className="sports-toolbar"><div><button onClick={()=>setTab("prematch")} className={tab==="prematch"?"active":""}>Pre-match</button><button onClick={()=>setTab("live")} className={tab==="live"?"active":""}><i/> Live now</button></div><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search team, league or country"/></label></div>
        <div className="quick-filters">{["All","Today","Tomorrow","Top leagues","Starting soon","Boosted"].map((x,i)=><button className={i===0?"active":""} key={x}>{x}</button>)}</div>
        <div className="market-labels"><span>{tab==="live"?"Live events":"Featured events"}</span><div><b>1</b><b>X</b><b>2</b><b>More</b></div></div>
        <div className="event-list">
          {visible.length===0&&<div className="no-events"><b>No events found</b><span>Try another sport, tab or search.</span></div>}
          {visible.map(e=><article className="event-card" key={e.id}>
            <div className="event-meta"><small><b>{e.country}</b> · {e.league}</small><div><button>☆</button><time>{e.live?<><i/> LIVE {e.minute}</>:e.time}</time></div></div>
            <div className="event-body"><div className="teams"><div><strong>{e.home}</strong><span>{e.live&&e.score?.split(" - ")[0]}</span></div><div><strong>{e.away}</strong><span>{e.live&&e.score?.split(" - ")[1]}</span></div><small>{e.live?"Live match result":"Match result"}</small></div><div className="odds-grid">{e.markets.map(m=>{const id=`${e.id}-${m.label}`;return <button key={m.label} className={slip.some(s=>s.id===id)?"selected":""} onClick={()=>toggle(e,m)}><span>{m.label}</span><b>{m.odds.toFixed(2)}</b></button>})}<button className="more">+{e.more}</button></div></div>
            <div className="event-footer"><button>▥ Stats</button><button>◉ Live tracker</button><span>{e.more} markets available</span></div>
          </article>)}
        </div>
        <div className="responsible-strip"><b>18+</b><span><strong>Bet responsibly.</strong> Set limits, take breaks and never chase losses.</span><Link href="/responsible-play">Responsible gaming</Link></div>
      </section>
      <BetSlip/>
    </section>
    <nav className="sports-mobile-nav"><Link href="/sports"><span>⚽</span>Sports</Link><Link href="/live"><span>●</span>Live</Link><button className="mobile-slip-button" onClick={()=>setMobileSlip(true)}><span>▤</span>Betslip<b>{slip.length}</b></button><Link href="/promotions"><span>★</span>Promos</Link><Link href="/dashboard"><span>◎</span>Account</Link></nav>
    {mobileSlip&&<div className="mobile-slip-wrap"><div className="mobile-slip-scrim" onClick={()=>setMobileSlip(false)}/><BetSlip mobile/></div>}
  </main>
}
