import Link from "next/link";
import type { CSSProperties } from "react";

const featuredGames = [
  { name: "Aviator", tag: "Crash", status: "Coming soon", accent: "#ff3658", copy: "Watch the multiplier climb and cash out before it flies away.", meta: "Fast rounds · Mobile first", icon: "✈" },
  { name: "Rocket X", tag: "Crash", status: "Demo lobby", accent: "#ffd700", copy: "Quick multiplier action with instant round history and wallet-ready stakes.", meta: "1.01x - 100x", icon: "▲" },
  { name: "Mkwanja Dice", tag: "Instant", status: "Coming soon", accent: "#00b341", copy: "Pick your chance, roll instantly, and keep the controls simple.", meta: "Low data · Fast play", icon: "◆" },
  { name: "Spin Gold", tag: "Slots", status: "Coming soon", accent: "#f7b731", copy: "Bright slot-style rounds with familiar symbols and easy stake chips.", meta: "Bonus rounds", icon: "◉" },
  { name: "Goal Rush", tag: "Arcade", status: "Preview", accent: "#38bdf8", copy: "Football-themed quick game made for short sessions between matches.", meta: "Sports themed", icon: "⚽" },
  { name: "Green Roulette", tag: "Table", status: "Coming soon", accent: "#22c55e", copy: "Simple red, black, green table play with a clean mobile layout.", meta: "Classic picks", icon: "●" },
];

const categories = ["All games", "Crash", "Instant", "Slots", "Table", "Arcade"];

export default function GamesHub() {
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
        {categories.map((category,index)=><button className={index===0?"active":""} key={category}><span>{index===0?"★":"•"}</span>{category}<b>{index===0?featuredGames.length:index+2}</b></button>)}
        <div className="games-help"><b>18+ only</b><span>Casino games are being prepared for wallet-backed play. Bet responsibly.</span><Link href="/responsible-play">Limits and rules</Link></div>
      </aside>

      <section className="games-content">
        <div className="games-hero">
          <div><span>FAST GAMES LOBBY</span><h1>Aviator, crash games and casino picks in one clean place.</h1><p>Built for quick discovery on mobile and desktop, with MkwanjaBet wallet controls ready for provider integration.</p><div><Link href="/wallet/deposit">Deposit funds</Link><Link href="/sports">Back to sports</Link></div></div>
          <div className="aviator-preview"><i>✈</i><strong>2.47x</strong><small>Cash out before flight</small></div>
        </div>

        <div className="games-filterbar"><div>{categories.slice(0,5).map((category,index)=><button className={index===0?"active":""} key={category}>{category}</button>)}</div><label><span>⌕</span><input placeholder="Search games"/></label></div>

        <div className="games-grid">
          {featuredGames.map(game=><article className="game-card" style={{"--game-accent":game.accent} as CSSProperties} key={game.name}>
            <div className="game-art"><span>{game.icon}</span><i>{game.tag}</i></div>
            <div className="game-copy"><small>{game.status}</small><h2>{game.name}</h2><p>{game.copy}</p><b>{game.meta}</b></div>
            <button>{game.status.includes("Coming")?"Notify me":"Open preview"}</button>
          </article>)}
        </div>
      </section>
    </section>
  </main>;
}