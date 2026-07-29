"use client";

import { useEffect } from "react";

const markup = `

<div id="page-progress"></div>
<nav class="site-nav">
<a aria-label="MkwanjaBet home" class="brand" href="#top"><span class="brand-mark">P</span><span>Mkwanja<span>Bet</span></span></a>
<button aria-label="Open navigation" class="nav-toggle"><i></i><i></i><i></i></button>
<div class="nav-scrim"></div>
<div class="nav-links">
<a href="/picks">Picks za Leo</a><a href="/results">Matokeo</a><a href="/premium">Premium</a><a href="#how">Jinsi Inavyofanya Kazi</a>
<a class="btn btn-small btn-outline" href="/login">Ingia</a><a class="btn btn-small btn-gold" href="/premium">Jiunge Prime</a>
</div>
</nav>
<main id="top">
<section class="hero glow-surface">
<div aria-hidden="true" class="pitch-lines"></div>
<div class="orb orb-one"></div><div class="orb orb-two"></div>
<div class="hero-grid shell">
<div class="hero-copy">
<div class="live-pill"><span></span> PICKS ZA LEO ZIKO HEWANI</div>
<h1>Picks bora.<br/><em>Maamuzi yenye maarifa.</em></h1>
<p>Utabiri wa mpira unaotegemea takwimu, matokeo yaliyo wazi na uchambuzi wa kina — kwa wanaothamini taarifa kuliko kelele.</p>
<div class="hero-actions"><a class="btn btn-gold" href="/picks">Angalia Picks za Leo <b>→</b></a><a class="btn btn-ghost" href="/results">Angalia Matokeo</a></div>
<div class="trust-row"><div><strong>78%</strong><span>Ufanisi wa siku 30</span></div><div><strong>1.84</strong><span>Wastani wa odds</span></div><div><strong>24/7</strong><span>Taarifa za mechi</span></div></div>
</div>
<div class="hero-visual reveal">
<div class="phone-shadow"></div>
<div class="phone">
<div class="phone-top"><div class="mini-brand"><span class="brand-mark small">P</span><div><b>MkwanjaBet</b><small>Uchambuzi wa mechi</small></div></div><button>⌁</button></div>
<div class="phone-greeting"><small>HABARI ZA JIONI</small><h3>Picks bora za leo</h3></div>
<div class="mini-stats"><div><b>08</b><span>Picks</span></div><div><b>06</b><span>Zimeshinda</span></div><div><b>01</b><span>Live</span></div><div><b>01</b><span>Zinasubiri</span></div></div>
<div class="phone-card">
<div class="match-meta"><span>Premier League</span><time>20:00</time></div>
<div class="teams"><div><i>AR</i><b>Arsenal</b></div><strong>VS</strong><div><i>CH</i><b>Chelsea</b></div></div>
<div class="pick"><span>Pick ya Prime</span><b>Zaidi ya magoli 1.5</b><em>1.42</em></div>
<div class="confidence"><span>Uhakika</span><b>84%</b><i><u style="width:84%"></u></i></div>
</div>
<div class="phone-card compact"><span>Champions League</span><b>BTTS — Yes</b><em>1.67</em></div>
<button class="phone-cta">Fungua picks zote za Premium</button>
<div class="phone-nav"><span>⌂<small>Nyumbani</small></span><span>◫<small>Picks</small></span><span class="active">◆<small>Prime</small></span><span>◎<small>Matokeo</small></span><span>○<small>Wasifu</small></span></div>
</div>
<div class="float-card win-card"><span>✓</span><div><small>Matokeo ya karibuni</small><b>Pick imeshinda</b></div><strong>+1.72</strong></div>
<div class="float-card alert-card"><span>⚡</span><div><small>Pick mpya</small><b>Uhakika mkubwa</b></div></div>
</div>
</div>
</section>
<div class="ticker"><div><span>PREMIER LEAGUE</span><i></i><span>CHAMPIONS LEAGUE</span><i></i><span>LA LIGA</span><i></i><span>SERIE A</span><i></i><span>BUNDESLIGA</span><i></i><span>MKWANJABET</span><i></i><span>PREMIER LEAGUE</span><i></i><span>CHAMPIONS LEAGUE</span></div></div>
<section class="section predictions-section" id="predictions">
<div class="shell">
<div class="section-head reveal"><div><span class="eyebrow">KITUO CHA MECHI</span><h2>Picks bora za leo</h2></div><p>Kila pick ina aina ya soko, odds, kiwango cha uhakika na hali ya mechi — bila taarifa zinazochanganya.</p></div>
<div class="filters reveal"><button class="active" data-filter="all">Picks zote</button><button data-filter="free">Bure</button><button data-filter="premium">Premium</button><button data-filter="high">Uhakika mkubwa</button><button data-filter="live">Live</button></div>
<div class="match-grid">
<article class="match-card reveal" data-type="free high"><div class="card-top"><span class="league">England · Premier League</span><span class="status upcoming">Leo · 20:00</span></div><div class="match-teams"><div><span class="crest">AR</span><b>Arsenal</b></div><strong>VS</strong><div><span class="crest">CH</span><b>Chelsea</b></div></div><div class="prediction-box"><small>Pick ya Prime</small><b>Over 1.5 goals</b><span>1.42</span></div><div class="card-bottom"><div class="meter"><span><b>84%</b> confidence</span><i><u style="width:84%"></u></i></div><button>Uchambuzi →</button></div></article>
<article class="match-card reveal" data-type="premium high"><div class="card-top"><span class="league">Europe · Champions League</span><span class="status upcoming">Leo · 22:00</span></div><div class="match-teams"><div><span class="crest">RM</span><b>Real Madrid</b></div><strong>VS</strong><div><span class="crest">BM</span><b>Bayern</b></div></div><div class="prediction-box"><small>Pick ya Premium</small><b>Timu zote kufunga</b><span>1.67</span></div><div class="card-bottom"><div class="meter"><span><b>81%</b> confidence</span><i><u style="width:81%"></u></i></div><button>Fungua →</button></div></article>
<article class="match-card reveal" data-type="premium live"><div class="card-top"><span class="league">Spain · La Liga</span><span class="status live"><i></i> Live · 62'</span></div><div class="match-teams"><div><span class="crest">BA</span><b>Barcelona</b></div><strong>2 — 1</strong><div><span class="crest">SE</span><b>Sevilla</b></div></div><div class="prediction-box"><small>Pick ya Prime</small><b>Barcelona kushinda</b><span>1.58</span></div><div class="card-bottom"><div class="meter"><span><b>76%</b> confidence</span><i><u style="width:76%"></u></i></div><button>Tazama mechi →</button></div></article>
</div>
<div class="center-action reveal"><a class="btn btn-outline" href="/picks">Angalia Picks Zote →</a></div>
</div>
</section>
<section class="section results-section" id="results">
<div class="shell results-grid">
<div class="results-copy reveal"><span class="eyebrow">USHAHIDI, SI AHADI</span><h2>Matokeo unayoweza kuyathibitisha.</h2><p>Kila pick hubaki wazi baada ya mechi kuanza. Zilizoshinda, zilizopotea na void huwekwa wazi ili uipime MkwanjaBet kwa matokeo halisi.</p><a class="text-link" href="/results">Angalia matokeo yote <span>→</span></a></div>
<div class="result-panel reveal">
<div class="result-panel-head"><div><small>MATOKEO YA JULAI</small><h3>Siku 30 zilizopita</h3></div><span class="profit">↗ Form nzuri</span></div>
<div class="big-rate"><strong data-count="78">0</strong><sup>%</sup><span>Ufanisi</span></div>
<div class="result-stats"><div><b>64</b><span>Zimeshinda</span></div><div><b>14</b><span>Zimepotea</span></div><div><b>04</b><span>Void</span></div><div><b>1.84</b><span>Wastani wa odds</span></div></div>
<div class="form-row"><span class="won">W</span><span class="won">W</span><span class="lost">L</span><span class="won">W</span><span class="won">W</span><span class="won">W</span><span class="void">V</span><span class="won">W</span><span class="won">W</span><span class="won">W</span></div>
</div>
</div>
</section>
<section class="section how-section" id="how"><div class="shell"><div class="section-head centered reveal"><span class="eyebrow">RAHISI KWA MAKUSUDI</span><h2>Kutoka orodha ya mechi hadi uamuzi wenye maarifa.</h2><p>MkwanjaBet inaweka matumizi yote wazi, ya haraka na yenye lengo.</p></div><div class="steps"><article class="reveal"><span>01</span><i>⌕</i><h3>Chunguza picks</h3><p>Chuja picks za kila siku kwa ligi, aina ya soko, hatari na uhakika.</p></article><article class="reveal"><span>02</span><i>◇</i><h3>Soma uchambuzi</h3><p>Tazama sababu, form ya karibuni na viashiria muhimu vya kila pick.</p></article><article class="reveal"><span>03</span><i>✓</i><h3>Fuatilia matokeo</h3><p>Fuatilia hali ya mechi na kagua kila pick iliyochapishwa kwa uwazi.</p></article></div></div></section>
<section class="section premium-section" id="premium"><div class="shell premium-wrap reveal"><div class="premium-copy"><span class="eyebrow">UANACHAMA WA PRIME</span><h2>Fungua picks maalum kwa wanaotaka uchambuzi wa kina.</h2><p>Fungua picks zenye uhakika mkubwa, uchambuzi wa kina, accumulators na arifa za papo kwa papo.</p><ul><li>Picks zote za Premium za kila siku</li><li>Picks za uhakika mkubwa na VIP</li><li>Uchambuzi kamili na viashiria vya mechi</li><li>Arifa za picks na matokeo papo kwa papo</li></ul></div><div class="pricing-card"><div class="popular">INAPENDWA ZAIDI</div><small>PRIME YA WIKI</small><h3>TZS 10,000</h3><p>Ufikiaji kamili wa Premium kwa siku 7</p><a class="btn btn-gold full" href="/checkout">Anza uanachama wa Prime →</a><span>Malipo salama kwa simu</span></div></div></section>
<section class="section final-cta"><div class="shell reveal"><span class="brand-mark large">P</span><h2>Pick yako inayofuata<br/>inaanzia hapa.</h2><p>Jiunge MkwanjaBet and experience football predictions with clarity, confidence and premium design.</p><a class="btn btn-gold" href="/picks">Angalia Picks za Leo →</a></div></section>
</main>
<footer><div class="shell footer-grid"><div><a class="brand" href="#top"><span class="brand-mark">P</span><span>Mkwanja<span>Bet</span></span></a><p>Picks bora za mpira.<br/>Uchambuzi ulio wazi zaidi.</p></div><div><b>Jukwaa</b><a href="#predictions">Picks</a><a href="/results">Matokeo</a><a href="/premium">Premium</a></div><div><b>Kampuni</b><a href="/about">Kuhusu</a><a href="/contact">Mawasiliano</a><a href="/responsible-play">Uwajibikaji</a></div><div><b>Sheria</b><a href="/terms">Masharti</a><a href="/privacy">Faragha</a><a href="/disclaimer">Tahadhari</a></div></div><div class="shell footer-bottom"><span>© 2026 MkwanjaBet. Haki zote zimehifadhiwa.</span><span>Imeundwa kusaidia maamuzi yenye maarifa, si kuahidi matokeo.</span></div></footer>
<button aria-label="Back to top" id="backtop">↑</button>


`;

export default function MkwanjaBetLanding() {
  useEffect(() => {
    const nav = document.querySelector(".site-nav");
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    const progress = document.getElementById("page-progress");
    const backTop = document.getElementById("backtop");

    const closeMenu = () => links?.classList.remove("open");
    const toggleMenu = () => links?.classList.toggle("open");
    toggle?.addEventListener("click", toggleMenu);
    document.querySelectorAll(".nav-links a").forEach((link) => link.addEventListener("click", closeMenu));

    const onScroll = () => {
      nav?.classList.toggle("scrolled", window.scrollY > 20);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = `${max ? (window.scrollY / max) * 100 : 0}%`;
      backTop?.classList.toggle("show", window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
    backTop?.addEventListener("click", goTop);

    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

    const counter = document.querySelector<HTMLElement>("[data-count]");
    let counterObserver: IntersectionObserver | undefined;
    if (counter) {
      counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = Number(counter.dataset.count || 0);
          let startedAt: number | null = null;
          const animate = (timestamp: number) => {
            startedAt ??= timestamp;
            const progressValue = Math.min((timestamp - startedAt) / 1200, 1);
            counter.textContent = String(Math.round(target * (1 - Math.pow(1 - progressValue, 3))));
            if (progressValue < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          counterObserver?.disconnect();
        });
      }, { threshold: 0.5 });
      counterObserver.observe(counter);
    }

    const filterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".filters button"));
    const filterHandlers = filterButtons.map((button) => {
      const handler = () => {
        filterButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const filter = button.dataset.filter || "all";
        document.querySelectorAll<HTMLElement>(".match-card").forEach((card) => {
          const types = card.dataset.type || "";
          card.classList.toggle("hidden", filter !== "all" && !types.includes(filter));
        });
      };
      button.addEventListener("click", handler);
      return [button, handler] as const;
    });

    const surface = document.querySelector<HTMLElement>(".glow-surface");
    const moveGlow = (event: MouseEvent) => {
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      surface.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    };
    surface?.addEventListener("mousemove", moveGlow);

    return () => {
      toggle?.removeEventListener("click", toggleMenu);
      document.querySelectorAll(".nav-links a").forEach((link) => link.removeEventListener("click", closeMenu));
      window.removeEventListener("scroll", onScroll);
      backTop?.removeEventListener("click", goTop);
      revealObserver.disconnect();
      counterObserver?.disconnect();
      filterHandlers.forEach(([button, handler]) => button.removeEventListener("click", handler));
      surface?.removeEventListener("mousemove", moveGlow);
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
