"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Tab = "overview" | "saved" | "payments" | "notifications" | "profile";

type Pick = {
  id: string;
  league: string;
  time: string;
  home: string;
  away: string;
  market: string;
  odds: number;
  confidence: number;
  premium?: boolean;
  saved?: boolean;
};

const initialPicks: Pick[] = [
  { id: "real-madrid-vs-bayern", league: "UEFA Champions League", time: "22:00", home: "Real Madrid", away: "Bayern Munich", market: "Timu zote kufunga", odds: 1.72, confidence: 91, premium: true, saved: true },
  { id: "arsenal-vs-chelsea", league: "England Premier League", time: "20:30", home: "Arsenal", away: "Chelsea", market: "Zaidi ya magoli 2.5", odds: 1.84, confidence: 86, saved: true },
  { id: "simba-vs-azam", league: "NBC Premier League", time: "19:00", home: "Simba SC", away: "Azam FC", market: "Simba kushinda au sare", odds: 1.41, confidence: 82 },
];

const menu: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Muhtasari", icon: "⌂" },
  { id: "saved", label: "Picks Nilizohifadhi", icon: "☆" },
  { id: "payments", label: "Historia ya Malipo", icon: "▣" },
  { id: "notifications", label: "Arifa", icon: "●" },
  { id: "profile", label: "Wasifu na Mipangilio", icon: "⚙" },
];

export default function DashibodiPage() {
  const [active, setActive] = useState<Tab>("overview");
  const [picks, setPicks] = useState(initialPicks);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Pick mpya ya Premium imeongezwa", copy: "Real Madrid vs Bayern Munich sasa inapatikana.", time: "Dakika 12 zilizopita", read: false },
    { id: 2, title: "Pick yako imeshinda", copy: "Barcelona vs Sevilla — Zaidi ya magoli 2.5.", time: "Jana, 23:41", read: false },
    { id: 3, title: "Subscription yako iko active", copy: "Prime Wiki itaisha tarehe 04 Agosti 2026.", time: "Jumatatu", read: true },
  ]);
  const [profileSaved, setProfileSaved] = useState(false);

  const savedPicks = useMemo(() => picks.filter((pick) => pick.saved), [picks]);
  const unread = notifications.filter((notification) => !notification.read).length;

  function toggleSaved(id: string) {
    setPicks((current) => current.map((pick) => pick.id === id ? { ...pick, saved: !pick.saved } : pick));
  }

  function markAllRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Mkwanja<span>Bet</span></span></Link>
        <nav className="dashboard-quick-links">
          <Link href="/picks">Picks za Leo</Link>
          <Link href="/results">Matokeo</Link>
          <Link href="/premium">Premium</Link>
        </nav>
        <div className="dashboard-user-mini">
          <button className="dashboard-bell" onClick={() => setActive("notifications")} aria-label="Arifa">♢{unread > 0 && <b>{unread}</b>}</button>
          <div className="dashboard-avatar">AS</div>
          <div><strong>Asha Salum</strong><span>Mwanachama wa Prime</span></div>
        </div>
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="dashboard-profile-card">
            <div className="dashboard-avatar large">AS</div>
            <div><strong>Asha Salum</strong><span>+255 712 345 678</span></div>
          </div>
          <div className="dashboard-plan-mini">
            <span>MPANGO WAKO</span>
            <strong>Prime Wiki</strong>
            <small>Siku 5 zimebaki</small>
            <i><u></u></i>
            <Link href="/checkout">Ongeza muda →</Link>
          </div>
          <nav className="dashboard-menu">
            {menu.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}><i>{item.icon}</i>{item.label}{item.id === "notifications" && unread > 0 && <b>{unread}</b>}</button>)}
          </nav>
          <Link className="dashboard-logout" href="/login">↗ Toka kwenye Akaunti</Link>
        </aside>

        <section className="dashboard-content">
          {active === "overview" && <Overview picks={picks} toggleSaved={toggleSaved} setActive={setActive} unread={unread} />}
          {active === "saved" && <SavedPicks picks={savedPicks} toggleSaved={toggleSaved} />}
          {active === "payments" && <Payments />}
          {active === "notifications" && <Notifications items={notifications} markAllRead={markAllRead} />}
          {active === "profile" && <Profile saved={profileSaved} onSave={() => { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2500); }} />}
        </section>
      </div>
    </main>
  );
}

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="dashboard-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>;
}

function Overview({ picks, toggleSaved, setActive, unread }: { picks: Pick[]; toggleSaved: (id: string) => void; setActive: (tab: Tab) => void; unread: number }) {
  return <>
    <div className="dashboard-welcome-row">
      <PageHeading eyebrow="JUMATANO, 29 JULAI" title="Karibu tena, Asha." copy="Picks zako, subscription na taarifa muhimu ziko hapa sehemu moja." />
      <Link className="btn btn-gold" href="/picks">Angalia Picks za Leo →</Link>
    </div>

    <div className="dashboard-stats">
      <article><span>Subscription</span><strong>Active</strong><small>Prime Wiki · siku 5 zimebaki</small><i className="positive">✓</i></article>
      <article><span>Picks za Leo</span><strong>18</strong><small>12 Premium · 6 Bure</small><i>⚽</i></article>
      <article><span>Picks Zilizohifadhiwa</span><strong>{picks.filter((pick) => pick.saved).length}</strong><small>Fungua tena kwa haraka</small><i>☆</i></article>
      <article onClick={() => setActive("notifications")} role="button" tabIndex={0}><span>Arifa Mpya</span><strong>{unread}</strong><small>Bonyeza kuona taarifa</small><i>●</i></article>
    </div>

    <section className="dashboard-section-card">
      <div className="dashboard-section-title"><div><span className="eyebrow">PICKS ZAKO</span><h2>Picks za leo.</h2></div><Link href="/picks">Tazama zote →</Link></div>
      <div className="dashboard-picks-grid">{picks.map((pick) => <DashibodiPick key={pick.id} pick={pick} toggleSaved={toggleSaved} />)}</div>
    </section>

    <div className="dashboard-lower-grid">
      <section className="dashboard-section-card dashboard-performance">
        <div className="dashboard-section-title"><div><span className="eyebrow">PERFORMANCE</span><h2>Siku 30 zilizopita.</h2></div><Link href="/results">Matokeo →</Link></div>
        <div className="performance-score"><div><strong>82%</strong><span>Hit rate</span></div><i><u></u></i></div>
        <div className="performance-numbers"><div><strong>41</strong><span>Zimeshinda</span></div><div><strong>7</strong><span>Zimepotea</span></div><div><strong>2</strong><span>Void</span></div></div>
        <div className="form-row"><span>Form ya mwisho</span><div><b>W</b><b>W</b><b>W</b><b className="loss">L</b><b>W</b><b>W</b></div></div>
      </section>

      <section className="dashboard-section-card dashboard-subscription">
        <span className="eyebrow">MEMBERSHIP</span><h2>Prime Wiki</h2><p>Ufikiaji kamili ya picks za Premium na uchambuzi hadi 04 Agosti 2026.</p>
        <div className="subscription-ring"><strong>5</strong><span>siku zimebaki</span></div>
        <Link className="btn btn-gold full" href="/checkout">Ongeza Subscription →</Link>
      </section>
    </div>
  </>;
}

function DashibodiPick({ pick, toggleSaved }: { pick: Pick; toggleSaved: (id: string) => void }) {
  return <article className={`dashboard-pick ${pick.premium ? "premium" : ""}`}>
    <div className="dashboard-pick-top"><span>{pick.league}</span><button onClick={() => toggleSaved(pick.id)} aria-label="Hifadhi pick">{pick.saved ? "★" : "☆"}</button></div>
    <div className="dashboard-pick-teams"><div><i>{pick.home.slice(0, 2).toUpperCase()}</i><strong>{pick.home}</strong></div><span><b>VS</b><small>{pick.time}</small></span><div><i>{pick.away.slice(0, 2).toUpperCase()}</i><strong>{pick.away}</strong></div></div>
    <div className="dashboard-pick-market"><span>{pick.premium ? "PICK YA PRIME" : "PICK YA LEO"}</span><strong>{pick.market}</strong></div>
    <div className="dashboard-pick-meta"><div><span>Odds</span><strong>{pick.odds.toFixed(2)}</strong></div><div><span>Uhakika</span><strong>{pick.confidence}%</strong></div></div>
    <i className="dashboard-confidence"><u style={{ width: `${pick.confidence}%` }}></u></i>
    <Link href={`/picks/${pick.id}`}>Fungua Uchambuzi →</Link>
  </article>;
}

function SavedPicks({ picks, toggleSaved }: { picks: Pick[]; toggleSaved: (id: string) => void }) {
  return <>
    <PageHeading eyebrow="MAKTABA YAKO" title="Picks Nilizohifadhi." copy="Mechi ulizoweka pembeni ili uzifungue tena kwa haraka." />
    {picks.length ? <div className="dashboard-picks-grid saved-page">{picks.map((pick) => <DashibodiPick key={pick.id} pick={pick} toggleSaved={toggleSaved} />)}</div> : <div className="dashboard-empty"><i>☆</i><h2>Hujahifadhi pick bado.</h2><p>Bonyeza alama ya nyota kwenye pick yoyote ili ionekane hapa.</p><Link className="btn btn-gold" href="/picks">Tafuta Picks →</Link></div>}
  </>;
}

function Payments() {
  const payments = [
    { id: "PO-260729-1842", date: "29 Julai 2026", plan: "Prime Wiki", method: "M-Pesa", amount: "TZS 9,000", status: "Imelipwa" },
    { id: "PO-260722-0915", date: "22 Julai 2026", plan: "Prime Wiki", method: "Mixx by Yas", amount: "TZS 9,000", status: "Imelipwa" },
    { id: "PO-260701-4438", date: "01 Julai 2026", plan: "Prime Mwezi", method: "Airtel Money", amount: "TZS 25,000", status: "Imelipwa" },
  ];
  return <>
    <PageHeading eyebrow="MALIPO" title="Historia ya Malipo." copy="Tazama subscription ulizonunua na hali ya kila muamala." />
    <div className="payment-summary"><div><span>Jumla ya Malipo</span><strong>TZS 43,000</strong></div><div><span>Subscription Active</span><strong>Prime Wiki</strong></div><Link className="btn btn-gold" href="/checkout">Nunua Mpango →</Link></div>
    <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Muamala</th><th>Tarehe</th><th>Mpango</th><th>Njia</th><th>Kiasi</th><th>Hali</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.id}</strong></td><td>{payment.date}</td><td>{payment.plan}</td><td>{payment.method}</td><td>{payment.amount}</td><td><span className="paid-badge">✓ {payment.status}</span></td></tr>)}</tbody></table></div>
  </>;
}

function Notifications({ items, markAllRead }: { items: { id: number; title: string; copy: string; time: string; read: boolean }[]; markAllRead: () => void }) {
  return <>
    <div className="dashboard-welcome-row"><PageHeading eyebrow="ARIFA" title="Taarifa zako." copy="Usikose picks mpya, matokeo na taarifa za subscription." /><button className="btn btn-outline" onClick={markAllRead}>Weka zote zimesomwa</button></div>
    <div className="notification-list">{items.map((item) => <article key={item.id} className={item.read ? "read" : ""}><i>{item.read ? "✓" : "●"}</i><div><strong>{item.title}</strong><p>{item.copy}</p><span>{item.time}</span></div>{!item.read && <b>MPYA</b>}</article>)}</div>
  </>;
}

function Profile({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return <>
    <PageHeading eyebrow="AKAUNTI" title="Wasifu na Mipangilio." copy="Sasisha taarifa zako na chagua aina ya arifa unazotaka kupokea." />
    <div className="profile-grid">
      <form className="dashboard-section-card profile-form" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <div className="dashboard-section-title"><div><span className="eyebrow">TAARIFA BINAFSI</span><h2>Wasifu wako.</h2></div></div>
        <div className="profile-two"><label><span>Jina la kwanza</span><input defaultValue="Asha" /></label><label><span>Jina la mwisho</span><input defaultValue="Salum" /></label></div>
        <label><span>Namba ya simu</span><input defaultValue="+255 712 345 678" /></label>
        <label><span>Barua pepe</span><input type="email" defaultValue="asha@example.com" /></label>
        <button className="btn btn-gold" type="submit">Hifadhi Mabadiliko</button>
        {saved && <div className="auth-success">✓ Mabadiliko yamehifadhiwa kwenye demo.</div>}
      </form>
      <div className="profile-side">
        <section className="dashboard-section-card settings-card"><span className="eyebrow">ARIFA</span><h2>Unataka kupokea nini?</h2><label><div><strong>Picks mpya</strong><span>Arifa pick mpya ikiwekwa.</span></div><input type="checkbox" defaultChecked /></label><label><div><strong>Matokeo</strong><span>Taarifa pick ikishinda au kupotea.</span></div><input type="checkbox" defaultChecked /></label><label><div><strong>Subscription</strong><span>Kumbusho kabla mpango haujaisha.</span></div><input type="checkbox" defaultChecked /></label></section>
        <section className="dashboard-section-card security-card"><span className="eyebrow">USALAMA</span><h2>Nenosiri na akaunti.</h2><button className="btn btn-outline full">Badilisha Nenosiri</button><button className="danger-action">Funga Akaunti</button></section>
      </div>
    </div>
  </>;
}
