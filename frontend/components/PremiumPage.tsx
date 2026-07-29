"use client";

import Link from "next/link";
import { useState } from "react";

type Plan = {
  key: string;
  name: string;
  duration: string;
  price: string;
  note: string;
  popular?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    key: "day",
    name: "Prime ya Siku",
    duration: "Masaa 24",
    price: "TZS 2,000",
    note: "Inafaa kwa kujaribu huduma",
    features: ["Picks zote za Premium", "Uchambuzi kamili", "Arifa za picks mpya"],
  },
  {
    key: "week",
    name: "Prime ya Wiki",
    duration: "Siku 7",
    price: "TZS 10,000",
    note: "Mpango unaopendwa zaidi",
    popular: true,
    features: ["Picks zote za Premium", "Picks za uhakika mkubwa", "Accumulators maalum", "Uchambuzi kamili", "Arifa za papo kwa papo"],
  },
  {
    key: "month",
    name: "Prime ya Mwezi",
    duration: "Siku 30",
    price: "TZS 30,000",
    note: "Thamani bora kwa watumiaji wa kudumu",
    features: ["Kila kilicho kwenye mpango wa wiki", "VIP selections", "Historia yote ya premium", "Msaada wa kipaumbele", "Akiba kubwa kwa mwezi"],
  },
];

const faqs = [
  ["Nitapata nini baada ya kulipia?", "Akaunti yako itafunguliwa mara moja na utaona picks zote za Premium, uchambuzi wa mechi, accumulators na arifa za picks mpya."],
  ["Naweza kulipa kwa njia gani?", "Tutatumia malipo salama ya simu kama M-Pesa, Mixx by Yas, Airtel Money, HaloPesa na T-Pesa mara backend ya malipo itakapounganishwa."],
  ["Premium ina uhakika wa ushindi?", "Hapana. MkwanjaBet hutoa uchambuzi na mapendekezo ya michezo, si dhamana ya ushindi. Tunasisitiza matumizi yenye uwajibikaji."],
  ["Mpango unaanza lini?", "Muda wa mpango huanza mara tu malipo yanapothibitishwa na access kufunguliwa kwenye akaunti yako."],
  ["Naweza kubadilisha mpango?", "Ndiyo. Unaweza kuongeza muda au kuchagua mpango mwingine kupitia dashboard yako."],
];

export default function PremiumPage() {
  const [selected, setSelected] = useState("week");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="premium-page">
      <header className="picks-nav premium-nav">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Mkwanja<span>Bet</span></span></Link>
        <nav>
          <Link href="/">Nyumbani</Link>
          <Link href="/picks">Picks za Leo</Link>
          <Link href="/results">Matokeo</Link>
          <Link className="active" href="/premium">Premium</Link>
        </nav>
        <div className="picks-nav-actions"><Link className="btn btn-small btn-outline" href="/login">Ingia</Link><Link className="btn btn-small btn-gold" href="/register">Jiunge</Link></div>
      </header>

      <section className="premium-hero">
        <div className="premium-shell premium-hero-grid">
          <div className="premium-hero-copy">
            <div className="crumb"><Link href="/">Nyumbani</Link><span>›</span><b>Premium</b></div>
            <span className="eyebrow">PRIME MEMBERSHIP</span>
            <h1>Picks bora zaidi.<br/><em>Uchambuzi wa kina zaidi.</em></h1>
            <p>Fungua picks tunazohifadhi kwa wanachama wa Prime, zikiwa na confidence kubwa, takwimu muhimu na maelezo yanayoeleweka.</p>
            <div className="premium-hero-actions"><a className="btn btn-gold" href="#plans">Chagua Mpango →</a><Link className="btn btn-ghost" href="/results">Angalia Matokeo</Link></div>
            <div className="premium-trust"><span>✓ Malipo salama</span><span>✓ Ufikiaji wa haraka</span><span>✓ Ghairi wakati wowote</span></div>
          </div>
          <div className="premium-preview-card">
            <div className="preview-glow"></div>
            <div className="preview-top"><span>PRIME PICK</span><b>91% Uhakika</b></div>
            <small>Champions League · 22:00</small>
            <div className="preview-teams"><div><i>RMA</i><strong>Real Madrid</strong></div><span>VS</span><div><i>BAY</i><strong>Bayern</strong></div></div>
            <div className="preview-lock"><span>◆</span><div><small>PICK YA PREMIUM</small><h3>Timu zote kufunga — Ndiyo</h3></div><b>1.67</b></div>
            <div className="preview-meter"><span><b>91%</b> Uhakika Mkubwa</span><i><u></u></i></div>
            <div className="preview-features"><span>Form ya timu</span><span>Head-to-head</span><span>Odds zenye thamani</span></div>
          </div>
        </div>
      </section>

      <section className="premium-benefits">
        <div className="premium-shell">
          <div className="premium-section-head"><span className="eyebrow">KINACHOFUNGUKA</span><h2>Zaidi ya pick moja tu.</h2><p>Kila membership inakupa mfumo mzima wa kufanya maamuzi kwa taarifa nzuri zaidi.</p></div>
          <div className="benefit-grid">
            <article><span>01</span><i>◆</i><h3>Picks za Premium</h3><p>Chaguo maalum zenye confidence kubwa na value odds iliyochambuliwa.</p></article>
            <article><span>02</span><i>⌁</i><h3>Uchambuzi Kamili</h3><p>Form, H2H, takwimu muhimu, kiwango cha hatari na sababu ya pick kwa lugha rahisi.</p></article>
            <article><span>03</span><i>⚡</i><h3>Arifa za Haraka</h3><p>Pata taarifa pick mpya inapochapishwa au mechi inapokaribia kuanza.</p></article>
            <article><span>04</span><i>◎</i><h3>Accumulators</h3><p>Mchanganyiko maalum wa picks ulioandaliwa kwa viwango tofauti vya risk.</p></article>
          </div>
        </div>
      </section>

      <section className="plans-section" id="plans">
        <div className="premium-shell">
          <div className="premium-section-head centered"><span className="eyebrow">CHAGUA MPANGO</span><h2>Prime inayokufaa.</h2><p>Anza na siku moja, wiki moja, au pata thamani bora kwa mwezi mzima.</p></div>
          <div className="plans-grid">
            {plans.map((plan) => (
              <article key={plan.key} onClick={() => setSelected(plan.key)} className={`plan-card ${plan.popular ? "popular" : ""} ${selected === plan.key ? "selected" : ""}`}>
                {plan.popular && <span className="plan-popular">UNAOPENDWA ZAIDI</span>}
                <div className="plan-check">{selected === plan.key ? "✓" : ""}</div>
                <small>{plan.duration}</small><h3>{plan.name}</h3><strong>{plan.price}</strong><p>{plan.note}</p>
                <ul>{plan.features.map((feature) => <li key={feature}>✓ <span>{feature}</span></li>)}</ul>
                <Link href="/checkout" className={`btn full ${plan.popular ? "btn-gold" : "btn-outline"}`}>Chagua Mpango →</Link>
              </article>
            ))}
          </div>
          <div className="payment-strip"><div><span>▣</span><p><b>Malipo ya simu yanayofahamika</b><small>M-Pesa · Mixx by Yas · Airtel Money · HaloPesa · T-Pesa</small></p></div><strong>Salama • Haraka • Rahisi</strong></div>
        </div>
      </section>

      <section className="premium-comparison">
        <div className="premium-shell comparison-grid">
          <div><span className="eyebrow">BURE VS PRIME</span><h2>Tofauti inaonekana kwenye kina cha taarifa.</h2><p>Unaweza kuanza bure, lakini Prime inafungua uchambuzi na picks maalum zinazokupa picha kamili zaidi ya kila mechi.</p><Link className="text-link" href="/picks">Tazama picks za leo <span>→</span></Link></div>
          <div className="comparison-card">
            <div className="comparison-row head"><b>Kipengele</b><b>Bure</b><b>Prime</b></div>
            {[
              ["Picks za kila siku", "✓", "✓"],
              ["Uchambuzi kamili", "—", "✓"],
              ["High-confidence picks", "—", "✓"],
              ["Accumulators maalum", "—", "✓"],
              ["Arifa za papo kwa papo", "—", "✓"],
              ["Historia ya Premium", "—", "✓"],
            ].map((row) => <div className="comparison-row" key={row[0]}><span>{row[0]}</span><span>{row[1]}</span><strong>{row[2]}</strong></div>)}
          </div>
        </div>
      </section>

      <section className="premium-testimonials">
        <div className="premium-shell"><div className="premium-section-head centered"><span className="eyebrow">WANACHAMA WA PRIME</span><h2>Imeundwa kwa uwazi na urahisi.</h2></div>
          <div className="testimonial-grid"><article><div>★★★★★</div><p>“Ninapenda kuona sababu ya pick, si kupewa odds pekee. Muonekano pia ni rahisi sana kwenye simu.”</p><b>Kelvin M.</b><span>Dar es Salaam</span></article><article><div>★★★★★</div><p>“Matokeo kubaki wazi yamenifanya niamini mfumo zaidi. Premium inaeleweka na haina mambo mengi yasiyo ya lazima.”</p><b>Asha K.</b><span>Arusha</span></article><article><div>★★★★★</div><p>“Confidence meter na kiwango cha hatari vinasaidia kuelewa pick haraka kabla ya kufungua uchambuzi wote.”</p><b>Brian J.</b><span>Mwanza</span></article></div>
        </div>
      </section>

      <section className="premium-faq">
        <div className="premium-shell faq-grid"><div><span className="eyebrow">MASWALI YA MARA KWA MARA</span><h2>Kabla hujajiunga.</h2><p>Majibu ya mambo muhimu kuhusu access, malipo na matumizi ya Prime.</p></div>
          <div className="faq-list">{faqs.map(([question, answer], index) => <article className={openFaq === index ? "open" : ""} key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)}><b>{question}</b><span>{openFaq === index ? "−" : "+"}</span></button><div><p>{answer}</p></div></article>)}</div>
        </div>
      </section>

      <section className="premium-final"><div className="premium-shell"><span className="brand-mark large">P</span><span className="eyebrow">UKO TAYARI?</span><h2>Fungua Prime.<br/>Tazama picha kamili.</h2><p>Chagua mpango wako na upate ufikiaji wa picks za Premium mara malipo yanapothibitishwa.</p><Link className="btn btn-gold" href="/checkout">Jiunge na Prime →</Link><small>MkwanjaBet hutoa uchambuzi wa michezo pekee. Cheza kwa uwajibikaji.</small></div></section>
    </main>
  );
}
