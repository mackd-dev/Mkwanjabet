"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Pick = {
  id: number;
  league: string;
  country: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  time: string;
  market: string;
  odds: number;
  confidence: number;
  access: "bure" | "premium";
  status: "upcoming" | "live";
  risk: "Ndogo" | "Wastani" | "Kubwa";
};

const picks: Pick[] = [
  { id: 1, league: "Premier League", country: "England", home: "Arsenal", away: "Chelsea", homeCode: "ARS", awayCode: "CHE", time: "20:00", market: "Zaidi ya magoli 1.5", odds: 1.42, confidence: 94, access: "bure", status: "upcoming", risk: "Ndogo" },
  { id: 2, league: "Champions League", country: "Ulaya", home: "Real Madrid", away: "Bayern Munich", homeCode: "RMA", awayCode: "BAY", time: "22:00", market: "Timu zote kufunga — Ndiyo", odds: 1.67, confidence: 91, access: "premium", status: "upcoming", risk: "Ndogo" },
  { id: 3, league: "La Liga", country: "Spain", home: "Barcelona", away: "Sevilla", homeCode: "BAR", awayCode: "SEV", time: "Live · 62'", market: "Barcelona kushinda", odds: 1.58, confidence: 86, access: "premium", status: "live", risk: "Wastani" },
  { id: 4, league: "NBC Premier League", country: "Tanzania", home: "Young Africans", away: "Azam FC", homeCode: "YNG", awayCode: "AZM", time: "19:00", market: "Zaidi ya magoli 1.5", odds: 1.51, confidence: 88, access: "bure", status: "upcoming", risk: "Wastani" },
  { id: 5, league: "Serie A", country: "Italy", home: "Inter Milan", away: "Atalanta", homeCode: "INT", awayCode: "ATA", time: "21:45", market: "Inter Milan — Draw no bet", odds: 1.49, confidence: 82, access: "premium", status: "upcoming", risk: "Wastani" },
  { id: 6, league: "Bundesliga", country: "Germany", home: "Dortmund", away: "Leverkusen", homeCode: "BVB", awayCode: "LEV", time: "18:30", market: "Timu zote kufunga — Ndiyo", odds: 1.61, confidence: 90, access: "premium", status: "upcoming", risk: "Ndogo" },
];

const tabs = [
  { key: "zote", label: "Zote" },
  { key: "bure", label: "Bure" },
  { key: "premium", label: "Premium" },
  { key: "live", label: "Live" },
  { key: "high", label: "Uhakika 90%+" },
];

export default function PicksPage() {
  const [tab, setTab] = useState("zote");
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("Ligi zote");

  const leagues = ["Ligi zote", ...Array.from(new Set(picks.map((pick) => pick.league)))];

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return picks.filter((pick) => {
      const tabMatch = tab === "zote" || pick.access === tab || pick.status === tab || (tab === "high" && pick.confidence >= 90);
      const queryMatch = !normalized || `${pick.home} ${pick.away} ${pick.league}`.toLowerCase().includes(normalized);
      const leagueMatch = league === "Ligi zote" || pick.league === league;
      return tabMatch && queryMatch && leagueMatch;
    });
  }, [tab, query, league]);

  const featured = picks[1];

  return (
    <main className="picks-page">
      <header className="picks-nav">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Mkwanja<span>Bet</span></span></Link>
        <nav>
          <Link href="/">Nyumbani</Link>
          <Link className="active" href="/picks">Picks za Leo</Link>
          <Link href="/results">Matokeo</Link>
          <Link href="/premium">Premium</Link>
        </nav>
        <div className="picks-nav-actions"><Link className="btn btn-small btn-outline" href="/login">Ingia</Link><Link className="btn btn-small btn-gold" href="/register">Jiunge</Link></div>
      </header>

      <section className="picks-hero">
        <div className="picks-shell">
          <div className="crumb"><Link href="/">Nyumbani</Link><span>›</span><b>Picks za Leo</b></div>
          <div className="picks-title-row">
            <div><span className="eyebrow">KITUO CHA MECHI</span><h1>Picks za Leo</h1><p>Picks zilizochambuliwa kwa takwimu, form ya timu na thamani ya odds.</p></div>
            <div className="today-chip"><span></span><div><small>ZIMESASISHWA</small><b>Leo · 18 Picks</b></div></div>
          </div>

          <article className="featured-pick">
            <div className="featured-glow"></div>
            <div className="featured-copy">
              <span className="featured-label">🔥 PICK YA SIKU</span>
              <small>{featured.country} · {featured.league} · {featured.time}</small>
              <div className="featured-teams"><div><i>{featured.homeCode}</i><b>{featured.home}</b></div><strong>VS</strong><div><i>{featured.awayCode}</i><b>{featured.away}</b></div></div>
              <div className="featured-market"><span>Prime Pick</span><h2>{featured.market}</h2></div>
              <div className="featured-metrics"><div><small>Odds</small><b>{featured.odds.toFixed(2)}</b></div><div><small>Uhakika</small><b>{featured.confidence}%</b></div><div><small>Hatari</small><b className="safe">● {featured.risk}</b></div></div>
              <div className="featured-actions"><Link className="btn btn-gold" href="/picks/real-madrid-vs-bayern">Fungua Uchambuzi →</Link><button className="btn btn-ghost" type="button" aria-label="Hifadhi pick ya siku">Hifadhi Pick</button></div>
            </div>
            <div className="featured-meter"><div className="meter-ring" style={{"--score": `${featured.confidence * 3.6}deg`} as React.CSSProperties}><div><b>{featured.confidence}%</b><span>Uhakika<br/>Mkubwa</span></div></div><p>Imechaguliwa kwa kuzingatia form, rekodi ya nyumbani na mwenendo wa magoli.</p></div>
          </article>
        </div>
      </section>

      <section className="picks-content">
        <div className="picks-shell">
          <div className="quick-stats"><div><b>18</b><span>Picks Leo</span></div><div><b>6</b><span>Za Bure</span></div><div><b>12</b><span>Premium</span></div><div><b>4</b><span>Uhakika 90%+</span></div></div>

          <div className="picks-toolbar">
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tafuta timu au ligi..." /></label>
            <select value={league} onChange={(event) => setLeague(event.target.value)}>{leagues.map((item) => <option key={item}>{item}</option>)}</select>
          </div>

          <div className="filter-tabs">{tabs.map((item) => <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>{item.label}</button>)}</div>

          <div className="list-heading"><div><span className="eyebrow">PICKS ZILIZOPO</span><h2>Mechi zilizochaguliwa</h2></div><span>{visible.length} zimepatikana</span></div>

          {visible.length ? <div className="picks-card-grid">{visible.map((pick) => <PickCard key={pick.id} pick={pick} />)}</div> : <div className="empty-picks"><div>⚽</div><h3>Hakuna picks zilizopatikana</h3><p>Badili kichujio au tafuta timu nyingine.</p></div>}

          <section className="responsible-note"><span>i</span><div><b>Cheza kwa uwajibikaji</b><p>MkwanjaBet hutoa uchambuzi na mapendekezo pekee. Hakuna pick yenye uhakika wa asilimia 100.</p></div><Link href="/responsible-play">Soma zaidi →</Link></section>
        </div>
      </section>
    </main>
  );
}

function PickCard({ pick }: { pick: Pick }) {
  const locked = pick.access === "premium";
  return (
    <article className={`po-pick-card ${locked ? "is-premium" : ""}`}>
      <div className="po-card-top"><span>{pick.country} · {pick.league}</span><b className={pick.status === "live" ? "is-live" : ""}>{pick.status === "live" && <i></i>}{pick.time}</b></div>
      <div className="po-teams"><div><i>{pick.homeCode}</i><strong>{pick.home}</strong></div><span>VS</span><div><i>{pick.awayCode}</i><strong>{pick.away}</strong></div></div>
      <div className="po-market"><small>{locked ? "Pick ya Premium" : "Pick ya Bure"}</small><b>{pick.market}</b><em>{pick.odds.toFixed(2)}</em></div>
      <div className="po-confidence"><div><span>Uhakika</span><b>{pick.confidence}%</b></div><i><u style={{width: `${pick.confidence}%`}}></u></i></div>
      <div className="po-card-foot"><span className={`risk risk-${pick.risk.toLowerCase()}`}>● Hatari {pick.risk}</span>{locked ? <Link href="/premium">Fungua Premium →</Link> : <Link href={`/picks/${pick.id === 1 ? "arsenal-vs-chelsea" : pick.id === 4 ? "young-africans-vs-azam" : "real-madrid-vs-bayern"}`}>Fungua Uchambuzi →</Link>}</div>
      {locked && <span className="premium-corner">PRIME</span>}
    </article>
  );
}
