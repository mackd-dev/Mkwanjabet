"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ResultStatus = "won" | "lost" | "void" | "pending";
type ResultPick = {
  id: number;
  date: string;
  league: string;
  country: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  score?: string;
  market: string;
  odds: number;
  status: ResultStatus;
  access: "bure" | "premium";
};

const results: ResultPick[] = [
  { id: 1, date: "28 Jul", league: "Premier League", country: "England", home: "Arsenal", away: "Chelsea", homeCode: "ARS", awayCode: "CHE", score: "2 — 1", market: "Zaidi ya magoli 1.5", odds: 1.42, status: "won", access: "bure" },
  { id: 2, date: "28 Jul", league: "Champions League", country: "Ulaya", home: "Real Madrid", away: "Bayern Munich", homeCode: "RMA", awayCode: "BAY", score: "2 — 2", market: "Timu zote kufunga — Ndiyo", odds: 1.67, status: "won", access: "premium" },
  { id: 3, date: "27 Jul", league: "La Liga", country: "Spain", home: "Barcelona", away: "Sevilla", homeCode: "BAR", awayCode: "SEV", score: "1 — 0", market: "Zaidi ya magoli 2.5", odds: 1.74, status: "lost", access: "premium" },
  { id: 4, date: "27 Jul", league: "NBC Premier League", country: "Tanzania", home: "Young Africans", away: "Azam FC", homeCode: "YNG", awayCode: "AZM", score: "2 — 0", market: "Young Africans kushinda", odds: 1.55, status: "won", access: "bure" },
  { id: 5, date: "26 Jul", league: "Serie A", country: "Italy", home: "Inter Milan", away: "Atalanta", homeCode: "INT", awayCode: "ATA", score: "1 — 1", market: "Inter Milan — Draw no bet", odds: 1.49, status: "void", access: "premium" },
  { id: 6, date: "Leo", league: "Bundesliga", country: "Germany", home: "Dortmund", away: "Leverkusen", homeCode: "BVB", awayCode: "LEV", market: "Timu zote kufunga — Ndiyo", odds: 1.61, status: "pending", access: "premium" },
  { id: 7, date: "26 Jul", league: "Ligue 1", country: "France", home: "PSG", away: "Marseille", homeCode: "PSG", awayCode: "MAR", score: "3 — 1", market: "PSG kushinda", odds: 1.48, status: "won", access: "premium" },
  { id: 8, date: "25 Jul", league: "Premier League", country: "England", home: "Liverpool", away: "Newcastle", homeCode: "LIV", awayCode: "NEW", score: "1 — 2", market: "Liverpool kushinda", odds: 1.63, status: "lost", access: "bure" },
];

const filters: { key: "all" | ResultStatus; label: string }[] = [
  { key: "all", label: "Zote" },
  { key: "won", label: "Zimeshinda" },
  { key: "lost", label: "Zimepotea" },
  { key: "pending", label: "Zinasubiri" },
  { key: "void", label: "Void" },
];

const statusCopy: Record<ResultStatus, { label: string; icon: string }> = {
  won: { label: "Imeshinda", icon: "✓" },
  lost: { label: "Imepotea", icon: "×" },
  void: { label: "Void", icon: "—" },
  pending: { label: "Inasubiri", icon: "◷" },
};

export default function ResultsPage() {
  const [filter, setFilter] = useState<"all" | ResultStatus>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return results.filter((item) => {
      const statusMatch = filter === "all" || item.status === filter;
      const searchMatch = !normalized || `${item.home} ${item.away} ${item.league} ${item.market}`.toLowerCase().includes(normalized);
      return statusMatch && searchMatch;
    });
  }, [filter, query]);

  return (
    <main className="results-page">
      <header className="picks-nav">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Prime<span>Odds</span></span></Link>
        <nav>
          <Link href="/">Nyumbani</Link>
          <Link href="/picks">Picks za Leo</Link>
          <Link className="active" href="/results">Matokeo</Link>
          <a href="/premium">Premium</a>
        </nav>
        <div className="picks-nav-actions"><Link className="btn btn-small btn-outline" href="/login">Ingia</Link><Link className="btn btn-small btn-gold" href="/register">Jiunge</Link></div>
      </header>

      <section className="results-hero">
        <div className="results-shell">
          <div className="crumb"><Link href="/">Nyumbani</Link><span>›</span><b>Matokeo</b></div>
          <div className="results-title-row">
            <div><span className="eyebrow">UWAZI WA PRIMEODDS</span><h1>Matokeo Yetu</h1><p>Kila pick hubaki wazi baada ya mechi. Tazama ushindi, hasara, void na picks zinazosubiri bila kuficha chochote.</p></div>
            <div className="results-period"><small>KIPINDI</small><b>Siku 30 zilizopita</b><span>Imesasishwa leo</span></div>
          </div>

          <div className="performance-panel">
            <div className="performance-rate"><div className="results-ring"><div><strong>78%</strong><span>Hit rate</span></div></div><p><b>Form nzuri</b><span>64 kati ya picks 82 zimeshinda</span></p></div>
            <div className="performance-numbers">
              <div><span className="result-dot won"></span><b>64</b><small>Zimeshinda</small></div>
              <div><span className="result-dot lost"></span><b>14</b><small>Zimepotea</small></div>
              <div><span className="result-dot void"></span><b>04</b><small>Void</small></div>
              <div><span className="result-dot pending"></span><b>03</b><small>Zinasubiri</small></div>
              <div><span className="odds-arrow">↗</span><b>1.84</b><small>Wastani wa Odds</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="results-content">
        <div className="results-shell">
          <div className="results-streak">
            <div><span className="eyebrow">FORM YA HIVI KARIBUNI</span><h2>Picks 10 za mwisho</h2></div>
            <div className="streak-pills"><span className="won">W</span><span className="won">W</span><span className="lost">L</span><span className="won">W</span><span className="won">W</span><span className="void">V</span><span className="won">W</span><span className="won">W</span><span className="lost">L</span><span className="won">W</span></div>
          </div>

          <div className="results-controls">
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tafuta timu, ligi au market..." /></label>
            <div className="filter-tabs result-filters">{filters.map((item) => <button key={item.key} className={filter === item.key ? "active" : ""} onClick={() => setFilter(item.key)}>{item.label}</button>)}</div>
          </div>

          <div className="list-heading"><div><span className="eyebrow">HISTORIA YA PICKS</span><h2>Matokeo ya hivi karibuni</h2></div><span>{visible.length} yamepatikana</span></div>

          <div className="results-list">
            {visible.map((item) => <ResultRow key={item.id} item={item} />)}
          </div>

          {!visible.length && <div className="empty-picks"><div>⚽</div><h3>Hakuna matokeo yaliyopatikana</h3><p>Badili kichujio au tafuta timu nyingine.</p></div>}

          <section className="results-transparency">
            <div><span>✓</span><h3>Hakuna matokeo yanayofutwa</h3><p>Pick ikishachapishwa, rekodi yake hubaki kwenye mfumo hata ikiwa imepotea au imekuwa void.</p></div>
            <div><span>◎</span><h3>Takwimu zinazoweza kuthibitishwa</h3><p>Hit rate, wastani wa odds na form ya hivi karibuni huhesabiwa kutoka kwenye picks zilizochapishwa.</p></div>
            <div><span>i</span><h3>Utabiri, si dhamana</h3><p>PrimeOdds hutoa uchambuzi wa michezo. Hakuna pick yenye uhakika wa asilimia 100.</p></div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ResultRow({ item }: { item: ResultPick }) {
  const status = statusCopy[item.status];
  return (
    <article className={`result-row status-${item.status}`}>
      <div className="result-date"><b>{item.date}</b><span>{item.country}</span></div>
      <div className="result-match">
        <small>{item.league}</small>
        <div><span><i>{item.homeCode}</i><b>{item.home}</b></span><strong>{item.score ?? "VS"}</strong><span><i>{item.awayCode}</i><b>{item.away}</b></span></div>
      </div>
      <div className="result-prediction"><small>{item.access === "premium" ? "Pick ya Premium" : "Pick ya Bure"}</small><b>{item.market}</b></div>
      <div className="result-odds"><small>Odds</small><b>{item.odds.toFixed(2)}</b></div>
      <div className={`result-status ${item.status}`}><span>{status.icon}</span><b>{status.label}</b></div>
    </article>
  );
}
