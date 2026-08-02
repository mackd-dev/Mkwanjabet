import Link from "next/link";

export default async function DemoGamePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ session?: string }> }) {
  const { slug } = await params;
  const { session } = await searchParams;
  return <main className="games-page demo-game-page">
    <section className="demo-game-shell">
      <Link className="sports-brand" href="/games"><img src="/brand/icon/mb-mark-color.png" alt="MkwanjaBet"/><span className="sr-only">MkwanjaBet</span></Link>
      <div className="demo-game-board"><span>DEMO GAME</span><h1>{slug.replace(/-/g, " ")}</h1><strong>2.47x</strong><p>Play-money launch session is ready. Real casino wallet debits and credits are disabled.</p><small>Session {session ?? "demo"}</small><div><Link href="/games">Back to games</Link><Link href="/responsible-play">Responsible play</Link></div></div>
    </section>
  </main>;
}