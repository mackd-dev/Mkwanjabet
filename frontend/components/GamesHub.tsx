"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api-client";

type CasinoGame = {
  id: string;
  slug: string;
  name: string;
  tag: string;
  type: string;
  status: string;
  provider: string;
  accent: string;
  icon: string;
  copy: string;
  meta: string;
  launchable: boolean;
};

type CasinoGamesResponse = { success: boolean; mode: string; games: CasinoGame[] };
type CasinoLaunchResponse = { success: boolean; session: { launchUrl: string; playMoneyBalanceTzs: number; gameName: string }; message: string };

const fallbackGames: CasinoGame[] = [
  { id: "aviator", slug: "aviator", name: "Aviator", tag: "Crash", type: "CRASH", status: "Demo lobby", provider: "demo", accent: "#ff3658", icon: "A", copy: "Watch the multiplier climb and cash out before it flies away.", meta: "Demo crash rounds", launchable: true },
  { id: "rocket-x", slug: "rocket-x", name: "Rocket X", tag: "Crash", type: "CRASH", status: "Demo lobby", provider: "demo", accent: "#ffd700", icon: "R", copy: "Quick multiplier action with instant round history and wallet-ready stakes.", meta: "1.01x - 100x", launchable: true },
  { id: "mkwanja-dice", slug: "mkwanja-dice", name: "Mkwanja Dice", tag: "Instant", type: "INSTANT", status: "Demo lobby", provider: "demo", accent: "#00b341", icon: "D", copy: "Pick your chance, roll instantly, and keep the controls simple.", meta: "Play-money dice", launchable: true },
  { id: "spin-gold", slug: "spin-gold", name: "Spin Gold", tag: "Slots", type: "SLOT", status: "Coming soon", provider: "demo", accent: "#f7b731", icon: "S", copy: "Bright slot-style rounds with familiar symbols and easy stake chips.", meta: "Bonus rounds", launchable: false },
  { id: "goal-rush", slug: "goal-rush", name: "Goal Rush", tag: "Arcade", type: "ARCADE", status: "Demo lobby", provider: "demo", accent: "#38bdf8", icon: "G", copy: "Football-themed quick game made for short sessions between matches.", meta: "Sports themed", launchable: true },
  { id: "green-roulette", slug: "green-roulette", name: "Green Roulette", tag: "Table", type: "TABLE", status: "Coming soon", provider: "demo", accent: "#22c55e", icon: "O", copy: "Simple table play with a clean mobile layout.", meta: "Classic picks", launchable: false },
];

export default function GamesHub() {
  const [games, setGames] = useState<CasinoGame[]>(fallbackGames);
  const [activeCategory, setActiveCategory] = useState("All games");
  const [query, setQuery] = useState("");
  const [busyGame, setBusyGame] = useState<string | null>(null);
  const [notice, setNotice] = useState("Demo mode only. No real wallet casino transactions are processed.");

  useEffect(() => {
    apiRequest<CasinoGamesResponse>("/casino/games").then((response) => {
      if (response.games.length) setGames(response.games);
      setNotice(`${response.mode} casino catalog loaded from API.`);
    }).catch(() => setNotice("Showing demo catalog fallback while the casino API is unavailable."));
  }, []);

  const categories = useMemo(() => ["All games", ...Array.from(new Set(games.map((game) => game.tag)))], [games]);
  const shownGames = games.filter((game) => (activeCategory === "All games" || game.tag === activeCategory) && `${game.name} ${game.copy} ${game.tag}`.toLowerCase().includes(query.toLowerCase()));

  async function launch(game: CasinoGame) {
    if (!game.launchable) { setNotice(`${game.name} is coming soon. The provider launch is not enabled yet.`); return; }
    setBusyGame(game.id);
    setNotice(`Launching ${game.name} in demo play-money mode...`);
    try {
      const response = await apiRequest<CasinoLaunchResponse>(`/casino/games/${encodeURIComponent(game.id)}/launch`, { method: "POST", body: JSON.stringify({}) });
      setNotice(response.message);
      window.location.href = response.session.launchUrl;
    } catch {
      setNotice("Could not launch the demo game right now. Please try again shortly.");
    } finally {
      setBusyGame(null);
    }
  }

  return <main className="games-page">
    <header className="sports-topbar games-topbar">
      <Link className="sports-brand" href="/"><img src="/brand/icon/mb-mark-color.png" alt="MkwanjaBet"/><span className="sr-only">MkwanjaBet</span></Link>
      <nav className="sports-toplinks"><Link href="/responsible-play">Responsible play</Link></nav>
      <div className="sports-actions"><Link className="wallet-preview" href="/dashboard"><small>Balance</small><b>TZS 0</b></Link><Link className="sports-register" href="/dashboard">My account</Link></div>
    </header>
    <div className="sports-mainnav games-mainnav">
      <Link href="/sports">Sports</Link><Link href="/live">Live</Link><Link className="active" href="/games">Games</Link><Link href="/my-bets">My bets</Link><Link href="/results">Results</Link><Link href="/wallet/deposit">Deposit</Link>
    </div>

    <section className="games-shell">
      <aside className="games-side">
        <h2>Games</h2>
        {categories.map((category,index)=><button className={activeCategory===category?"active":""} onClick={()=>setActiveCategory(category)} key={category}><span>{index===0?"*":"-"}</span>{category}<b>{category==="All games"?games.length:games.filter(game=>game.tag===category).length}</b></button>)}
        <div className="games-help"><b>18+ only</b><span>Casino games are connected in demo/play-money mode while provider licensing is prepared.</span><Link href="/responsible-play">Limits and rules</Link></div>
      </aside>

      <section className="games-content">
        <div className="games-hero">
          <div><span>FAST GAMES LOBBY</span><h1>Aviator, crash games and casino picks in one clean place.</h1><p>Built for quick discovery on mobile and desktop, with MkwanjaBet wallet controls ready for provider integration.</p><div><Link href="/wallet/deposit">Deposit funds</Link><Link href="/sports">Back to sports</Link></div></div>
          <div className="aviator-preview"><i>A</i><strong>2.47x</strong><small>Demo cash out flow</small></div>
        </div>

        <div className="games-filterbar"><div>{categories.slice(0,5).map((category)=><button className={activeCategory===category?"active":""} onClick={()=>setActiveCategory(category)} key={category}>{category}</button>)}</div><label><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search games"/></label></div>
        {notice&&<div className="games-notice">{notice}</div>}

        <div className="games-grid">
          {shownGames.map(game=><article className="game-card" style={{"--game-accent":game.accent} as CSSProperties} key={game.id}>
            <div className="game-art"><span>{game.icon}</span><i>{game.tag}</i></div>
            <div className="game-copy"><small>{game.status}</small><h2>{game.name}</h2><p>{game.copy}</p><b>{game.meta}</b></div>
            <button onClick={()=>launch(game)} disabled={busyGame===game.id}>{busyGame===game.id?"Launching...":game.launchable?"Play demo":"Notify me"}</button>
          </article>)}
        </div>
      </section>
    </section>
  </main>;
}