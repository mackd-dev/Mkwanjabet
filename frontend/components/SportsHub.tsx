"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Selection = { id:string; match:string; market:string; pick:string; odds:number };
const events = [
 {id:"ars-che",league:"England • Premier League",time:"20:00",home:"Arsenal",away:"Chelsea",markets:[['1',1.84],['X',3.55],['2',4.40]]},
 {id:"bar-atm",league:"Spain • La Liga",time:"22:00",home:"Barcelona",away:"Atlético Madrid",markets:[['1',1.72],['X',3.90],['2',4.95]]},
 {id:"int-juv",league:"Italy • Serie A",time:"21:45",home:"Inter Milan",away:"Juventus",markets:[['1',2.02],['X',3.25],['2',3.85]]},
 {id:"bay-bvb",league:"Germany • Bundesliga",time:"19:30",home:"Bayern Munich",away:"Dortmund",markets:[['1',1.58],['X',4.30],['2',5.20]]},
];

export default function SportsHub(){
 const [tab,setTab]=useState<'prematch'|'live'>('prematch');
 const [sport,setSport]=useState('Football');
 const [query,setQuery]=useState('');
 const [slip,setSlip]=useState<Selection[]>([]);
 const [stake,setStake]=useState(5000);
 const visible=events.filter(e=>`${e.home} ${e.away} ${e.league}`.toLowerCase().includes(query.toLowerCase()));
 const totalOdds=useMemo(()=>slip.reduce((n,s)=>n*s.odds,1),[slip]);
 const toggle=(e:typeof events[number],m:(string|number)[])=>{
   const id=`${e.id}-${m[0]}`;
   const next={id,match:`${e.home} vs ${e.away}`,market:'1X2',pick:String(m[0]),odds:Number(m[1])};
   setSlip(x=>x.some(s=>s.id===id)?x.filter(s=>s.id!==id):[...x.filter(s=>!s.id.startsWith(e.id+'-')),next]);
 };
 return <main className="sports-shell">
   <header className="sports-topbar">
    <Link className="sports-brand" href="/"><span>M</span>Mkwanja<b>Bet</b></Link>
    <nav><Link href="/sports">Sports</Link><Link href="/picks">Picks</Link><Link href="/results">Results</Link><Link href="/premium">Premium</Link></nav>
    <div className="sports-actions"><Link href="/login">Log in</Link><Link className="sports-register" href="/register">Register</Link></div>
   </header>
   <div className="sports-mainnav">
    {['Sports','Live','Jackpot','Livescore','Results','Promotions'].map((x,i)=><button key={x} className={i===0?'active':''}>{x}</button>)}
   </div>
   <section className="sports-layout">
    <aside className="sports-left">
      <h3>Sports</h3>
      {['Football','Basketball','Tennis','Volleyball','Ice Hockey','Table Tennis'].map((x,i)=><button key={x} onClick={()=>setSport(x)} className={sport===x?'active':''}><span>{['⚽','🏀','🎾','🏐','◉','◌'][i]}</span>{x}<small>{18-i*2}</small></button>)}
      <h3>Top Leagues</h3>
      {['Premier League','Champions League','La Liga','Serie A','Bundesliga'].map(x=><button key={x}>{x}</button>)}
    </aside>
    <section className="sports-content">
      <div className="sports-hero"><div><span>MKWANJABET SPORTS</span><h1>All the action.<br/>One powerful match centre.</h1><p>Browse markets, compare picks and build a private selection list in a fast, familiar sports interface.</p></div><div className="hero-stat"><b>120+</b><span>events today</span></div></div>
      <div className="sports-toolbar"><div><button onClick={()=>setTab('prematch')} className={tab==='prematch'?'active':''}>Pre-match</button><button onClick={()=>setTab('live')} className={tab==='live'?'active':''}>Live</button></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search team or league"/></div>
      <div className="quick-filters">{['All','Today','Tomorrow','Top Leagues','High Confidence'].map((x,i)=><button className={i===0?'active':''} key={x}>{x}</button>)}</div>
      <div className="event-list">
       <div className="event-head"><span>Events</span><div><b>1</b><b>X</b><b>2</b><b>More</b></div></div>
       {visible.map(e=><article className="event-card" key={e.id}>
         <div className="event-meta"><small>{e.league}</small><time>{tab==='live'?<><i/> LIVE 63'</>:e.time}</time></div>
         <div className="event-body"><div className="teams"><strong>{e.home}</strong><strong>{e.away}</strong><span>Match winner</span></div><div className="odds-grid">{e.markets.map(m=>{const id=`${e.id}-${m[0]}`;return <button key={String(m[0])} className={slip.some(s=>s.id===id)?'selected':''} onClick={()=>toggle(e,m)}><span>{m[0]}</span><b>{Number(m[1]).toFixed(2)}</b></button>})}<button className="more">+42</button></div></div>
       </article>)}
      </div>
      <div className="responsible-strip"><b>18+</b><span>Play responsibly. MkwanjaBet does not guarantee sporting outcomes.</span><Link href="/responsible-play">Learn more</Link></div>
    </section>
    <aside className="betslip">
      <div className="betslip-tabs"><button className="active">Selection List <b>{slip.length}</b></button><button>My Picks</button></div>
      {!slip.length?<div className="empty-slip"><span>＋</span><h3>Your list is empty</h3><p>Tap an odd to add a match selection.</p><div><b>Booking code</b><input placeholder="Enter code"/><button>Load</button></div></div>:<>
       <div className="slip-items">{slip.map(s=><article key={s.id}><button onClick={()=>setSlip(x=>x.filter(v=>v.id!==s.id))}>×</button><small>{s.market}</small><strong>{s.pick} · {s.match}</strong><b>{s.odds.toFixed(2)}</b></article>)}</div>
       <div className="slip-summary"><label>Stake (TZS)<input type="number" value={stake} onChange={e=>setStake(Number(e.target.value)||0)}/></label><p><span>Total odds</span><b>{totalOdds.toFixed(2)}</b></p><p><span>Potential return</span><b>TZS {(stake*totalOdds).toLocaleString()}</b></p><button className="review-btn">Review selections</button><small>Demo interface only. No real-money bet is placed.</small></div>
      </>}
    </aside>
   </section>
   <nav className="sports-mobile-nav"><Link href="/sports">Sports</Link><Link href="/picks">Picks</Link><button>Slip <b>{slip.length}</b></button><Link href="/results">Results</Link><Link href="/dashboard">Account</Link></nav>
 </main>
}
