import Link from "next/link";

const formHome = ["W", "W", "D", "W", "L"];
const formAway = ["W", "D", "W", "L", "W"];

export default function MatchAnalysisPage() {
  return (
    <main className="analysis-page">
      <header className="picks-nav">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Mkwanja<span>Bet</span></span></Link>
        <nav>
          <Link href="/">Nyumbani</Link>
          <Link className="active" href="/picks">Picks za Leo</Link>
          <Link href="/results">Matokeo</Link>
          <a href="/premium">Premium</a>
        </nav>
        <div className="picks-nav-actions"><Link className="btn btn-small btn-outline" href="/login">Ingia</Link><Link className="btn btn-small btn-gold" href="/register">Jiunge</Link></div>
      </header>

      <section className="analysis-hero">
        <div className="analysis-shell">
          <div className="crumb"><Link href="/">Nyumbani</Link><span>›</span><Link href="/picks">Picks za Leo</Link><span>›</span><b>Uchambuzi wa Mechi</b></div>

          <div className="analysis-match-head">
            <div className="analysis-league"><span>UEFA CHAMPIONS LEAGUE</span><b>Leo · 22:00</b></div>
            <div className="analysis-teams">
              <div><i>RMA</i><h1>Real Madrid</h1><small>Nyumbani</small></div>
              <strong><span>VS</span><small>Santiago Bernabéu</small></strong>
              <div><i>BAY</i><h1>Bayern Munich</h1><small>Ugenini</small></div>
            </div>
            <div className="analysis-status"><span></span> Mechi haijaanza</div>
          </div>
        </div>
      </section>

      <section className="analysis-body">
        <div className="analysis-shell analysis-grid">
          <div className="analysis-main">
            <article className="prime-recommendation">
              <div className="prime-rec-top"><span>★ PICK YA PRIME</span><small>Imesasishwa dakika 12 zilizopita</small></div>
              <div className="prime-rec-content">
                <div>
                  <small>PENDEKEZO KUU</small>
                  <h2>Timu zote kufunga — Ndiyo</h2>
                  <p>Timu zote mbili zimeonyesha uwezo mkubwa wa kufunga katika mechi zao za karibuni, huku safu zao za ulinzi zikiruhusu nafasi nyingi.</p>
                </div>
                <div className="odds-box"><small>ODDS</small><b>1.67</b><span>Thamani nzuri</span></div>
              </div>
              <div className="confidence-breakdown">
                <div className="confidence-score"><div className="mini-ring"><b>91%</b></div><span><b>Uhakika Mkubwa</b><small>Kiwango cha MkwanjaBet</small></span></div>
                <div className="confidence-factors">
                  <div><span>Form ya timu</span><b>94%</b><i><u style={{width:"94%"}} /></i></div>
                  <div><span>Historia ya magoli</span><b>90%</b><i><u style={{width:"90%"}} /></i></div>
                  <div><span>Thamani ya odds</span><b>87%</b><i><u style={{width:"87%"}} /></i></div>
                </div>
              </div>
              <div className="analysis-actions"><button className="btn btn-gold">Hifadhi Pick</button><button className="btn btn-ghost">Shiriki Uchambuzi</button></div>
            </article>

            <article className="analysis-card">
              <div className="analysis-card-title"><span>UCHAMBUZI</span><h2>Kwa nini pick hii?</h2></div>
              <div className="reason-list">
                <div><b>01</b><p><strong>Real Madrid wana nguvu nyumbani.</strong> Wamefunga katika mechi 9 kati ya 10 za mwisho kwenye uwanja wao.</p></div>
                <div><b>02</b><p><strong>Bayern wanaendelea kuwa hatari mbele.</strong> Wastani wao wa magoli katika mechi tano zilizopita ni zaidi ya magoli mawili.</p></div>
                <div><b>03</b><p><strong>Rekodi ya timu hizi inaunga mkono BTTS.</strong> Mechi nne kati ya tano za mwisho zilikuwa na magoli kutoka pande zote.</p></div>
              </div>
            </article>

            <article className="analysis-card">
              <div className="analysis-card-title"><span>FORM YA KARIBUNI</span><h2>Mechi 5 zilizopita</h2></div>
              <div className="form-comparison">
                <div><div className="form-team"><i>RMA</i><span><b>Real Madrid</b><small>Magoli 12 · Wastani 2.4</small></span></div><div className="form-pills">{formHome.map((x,i)=><em className={`form-${x.toLowerCase()}`} key={i}>{x}</em>)}</div></div>
                <div><div className="form-team"><i>BAY</i><span><b>Bayern Munich</b><small>Magoli 11 · Wastani 2.2</small></span></div><div className="form-pills">{formAway.map((x,i)=><em className={`form-${x.toLowerCase()}`} key={i}>{x}</em>)}</div></div>
              </div>
            </article>

            <article className="analysis-card">
              <div className="analysis-card-title"><span>TAKWIMU MUHIMU</span><h2>Ulinganisho wa timu</h2></div>
              <div className="stats-table">
                <div><b>2.4</b><span>Wastani wa magoli</span><b>2.2</b></div>
                <div><b>70%</b><span>BTTS mechi 10</span><b>80%</b></div>
                <div><b>60%</b><span>Clean sheets</span><b>30%</b></div>
                <div><b>8.1</b><span>Shots on target</span><b>7.6</b></div>
              </div>
            </article>

            <article className="analysis-card">
              <div className="analysis-card-title"><span>CHAGUO MBADALA</span><h2>Masoko mengine</h2></div>
              <div className="alt-markets">
                <div><span>Zaidi ya magoli 2.5</span><b>1.82</b><em>Uhakika 84%</em></div>
                <div><span>Real Madrid kufunga zaidi ya 1.5</span><b>1.74</b><em>Uhakika 82%</em></div>
                <div><span>Double chance: Real Madrid au Sare</span><b>1.28</b><em>Uhakika 93%</em></div>
              </div>
            </article>
          </div>

          <aside className="analysis-side">
            <article className="side-card h2h-card"><span>HEAD-TO-HEAD</span><h3>Mechi 5 zilizopita</h3><div className="h2h-score"><div><b>3</b><small>Real Madrid</small></div><strong>1</strong><div><b>1</b><small>Bayern</small></div></div><p>Mechi 4 kati ya 5 zilikuwa na timu zote kufunga.</p></article>
            <article className="side-card"><span>TAARIFA YA HATARI</span><h3>Hatari ndogo</h3><div className="risk-meter"><i></i><i></i><i></i><i className="off"></i><i className="off"></i></div><p>Pick inaungwa mkono na form nzuri, lakini mechi za mtoano zinaweza kuwa na tahadhari zaidi.</p></article>
            <article className="side-card premium-upsell"><span>MKWANJABET PREMIUM</span><h3>Pata picks zote za Premium</h3><p>Fungua uchambuzi kamili, accumulator za kila siku na arifa za haraka.</p><button className="btn btn-gold">Fungua Premium</button></article>
            <article className="side-card responsible-small"><b>Cheza kwa uwajibikaji</b><p>Uchambuzi huu ni mapendekezo pekee. Hakuna matokeo yenye uhakika wa 100%.</p></article>
          </aside>
        </div>
      </section>
    </main>
  );
}
