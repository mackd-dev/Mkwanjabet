import Link from "next/link";
import AviatorDemoGame from "@/components/AviatorDemoGame";

export default async function DemoGamePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ session?: string }> }) {
  const { slug } = await params;
  const { session } = await searchParams;
  return <main className="games-page demo-game-page">
    <section className="demo-game-shell">
      <header className="demo-game-header"><Link className="sports-brand" href="/games"><img src="/brand/icon/mb-mark-color.png" alt="MkwanjaBet"/><span className="sr-only">MkwanjaBet</span></Link><div><span>DEMO GAME</span><b>{slug.replace(/-/g, " ")}</b></div><Link href="/games">Back to games</Link></header>
      <AviatorDemoGame slug={slug} session={session}/>
    </section>
  </main>;
}