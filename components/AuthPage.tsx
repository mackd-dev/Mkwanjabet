"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register" | "forgot" | "verify";

type Props = { mode: Mode };

const content = {
  login: {
    eyebrow: "KARIBU TENA",
    title: "Ingia kwenye Mkwanjabet.",
    copy: "Fungua wallet, picks na historia ya akaunti yako.",
    submit: "Ingia kwenye Akaunti",
  },
  register: {
    eyebrow: "FUNGA AKAUNTI",
    title: "Fungua akaunti yako.",
    copy: "Jiunge na Mkwanjabet, hifadhi picks na ufungue Premium kwa urahisi.",
    submit: "Fungua Akaunti",
  },
  forgot: {
    eyebrow: "REJESHA AKAUNTI",
    title: "Umesahau nenosiri?",
    copy: "Weka namba ya simu au barua pepe uliyotumia kufungua akaunti.",
    submit: "Tuma Namba ya Uthibitisho",
  },
  verify: {
    eyebrow: "THIBITISHA AKAUNTI",
    title: "Weka namba tuliyokutumia.",
    copy: "Tumetuma namba ya tarakimu sita kwa mawasiliano yako.",
    submit: "Thibitisha na Endelea",
  },
} satisfies Record<Mode, { eyebrow: string; title: string; copy: string; submit: string }>;

export default function AuthPage({ mode }: Props) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const page = content[mode];
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isVerify = mode === "verify";

  const message = useMemo(() => {
    if (!submitted) return "";
    if (isLogin) return "Demo: login imepokelewa. Backend itaunganisha akaunti halisi baadaye.";
    if (isRegister) return "Demo: taarifa zimepokelewa. Hatua inayofuata ni uthibitisho wa akaunti.";
    if (isForgot) return "Demo: namba ya uthibitisho imetumwa.";
    return "Demo: akaunti imethibitishwa kwa mafanikio.";
  }, [submitted, isLogin, isRegister, isForgot]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (isLogin) setTimeout(() => router.push("/dashboard"), 500);
  }

  function updateOtp(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit) document.getElementById(`otp-${index + 1}`)?.focus();
  }

  return (
    <main className="auth-page">
      <header className="auth-nav">
        <Link className="brand" href="/"><span className="brand-mark">M</span><span>Mkwanja<span>Bet</span></span></Link>
        <Link className="auth-back" href="/">← Rudi Nyumbani</Link>
      </header>

      <section className="auth-layout">
        {/* DESKTOP showcase (hidden on mobile via CSS) */}
        <aside className="auth-showcase">
          <div className="auth-showcase-glow"></div>
          <span className="eyebrow">ENEO LA WANACHAMA WA MKWANJABET</span>
          <h2>Picks zako.<br/><em>Wallet moja salama.</em></h2>
          <p>Ingia kuona picks za leo, subscription, salio la wallet na historia ya matokeo.</p>
          <div className="auth-feature-list">
            <article><i>01</i><div><b>Wallet Salama</b><span>Fuatilia deposits, stakes na withdrawals.</span></div></article>
            <article><i>02</i><div><b>Tickets Zako</b><span>Pitia bets zilizo wazi na zilizomalizika.</span></div></article>
            <article><i>03</i><div><b>Usalama wa Akaunti</b><span>OTP, 2FA na huduma ya mteja 24/7.</span></div></article>
          </div>
          <div className="auth-mini-card">
            <div><span>UHAKIKA WA PICK</span><strong>91%</strong></div>
            <i><u></u></i>
            <small>Uchambuzi wa kina · Kiwango cha hatari · Odds zenye thamani</small>
          </div>
        </aside>

        <div className="auth-panel-wrap">
          {/* MOBILE compact hero (hidden on desktop) */}
          <div className="auth-mobile-hero">
            <div className="auth-mobile-bar">
              <span className="eyebrow">UHAKIKA WA PICK</span>
              <div className="auth-mobile-meter"><span>91%</span><i><u></u></i></div>
            </div>
            <span className="eyebrow eyebrow-mobile">SECURE MKWANJABET ACCOUNT</span>
            <h2 className="auth-mobile-headline">Wallet yako.<strong>Ticket moja. Akaunti moja.</strong></h2>
            <ul className="auth-mobile-features">
              <li><i>01</i><b>Wallet salama</b><span>Deposits, stakes & withdrawals</span></li>
              <li><i>02</i><b>Tickets</b><span>Picks za leo kwa haraka</span></li>
              <li><i>03</i><b>Usalama</b><span>OTP na huduma 24/7</span></li>
            </ul>
          </div>

          <div className="auth-panel">
            <span className="eyebrow eyebrow-panel">{page.eyebrow}</span>
            <h1>{page.title}</h1>
            <p className="auth-intro">{page.copy}</p>

            <form onSubmit={handleSubmit} className="auth-form">
              {isRegister && (
                <div className="auth-two-col">
                  <label><span>Jina la kwanza</span><input required placeholder="Mfano: Asha" /></label>
                  <label><span>Jina la mwisho</span><input required placeholder="Mfano: Salum" /></label>
                </div>
              )}

              {!isVerify && (
                <label>
                  <span>{isForgot ? "Namba ya simu au barua pepe" : "Namba ya simu"}</span>
                  <div className="phone-field">{!isForgot && <b>+255</b>}<input required type={isForgot ? "text" : "tel"} placeholder={isForgot ? "07XXXXXXXX au email@example.com" : "7XX XXX XXX"} /></div>
                </label>
              )}

              {isRegister && <label><span>Barua pepe <small>(si lazima)</small></span><input type="email" placeholder="jina@example.com" /></label>}

              {(isLogin || isRegister) && (
                <label>
                  <span>Nenosiri</span>
                  <div className="password-field"><input required minLength={6} type={showPassword ? "text" : "password"} placeholder="Angalau tarakimu 6" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ficha" : "Onyesha"}</button></div>
                </label>
              )}

              {isRegister && (
                <label className="auth-check"><input required type="checkbox"/><span>Ninakubali <a href="/terms">Masharti ya Matumizi</a> na <a href="/privacy">Sera ya Faragha</a>.</span></label>
              )}

              {isLogin && <div className="auth-row"><label className="auth-check"><input type="checkbox"/><span>Nikumbuke</span></label><Link href="/forgot-password">Umesahau nenosiri?</Link></div>}

              {isVerify && (
                <div className="otp-wrap">
                  <div className="otp-grid">{otp.map((digit, index) => <input id={`otp-${index}`} key={index} inputMode="numeric" maxLength={1} value={digit} onChange={(event) => updateOtp(index, event.target.value)} />)}</div>
                  <p>Hujapokea namba? <button type="button">Tuma tena</button></p>
                </div>
              )}

              <button className="btn btn-gold auth-submit" type="submit">{page.submit} →</button>
              {message && <div className="auth-success">✓ {message}</div>}
            </form>

            {(isLogin || isRegister) && <div className="auth-divider"><span>AU</span></div>}
            {(isLogin || isRegister) && <button className="auth-social"><span>G</span> Endelea na Google</button>}

            <p className="auth-switch">
              {isLogin && <>Huna akaunti? <Link href="/register">Jiunge sasa</Link></>}
              {isRegister && <>Tayari una akaunti? <Link href="/login">Ingia hapa</Link></>}
              {isForgot && <>Umekumbuka nenosiri? <Link href="/login">Rudi kuingia</Link></>}
              {isVerify && <>Umeweka namba isiyo sahihi? <Link href="/register">Badilisha mawasiliano</Link></>}
            </p>
          </div>
          <p className="auth-disclaimer">18+ only. Mkwanjabet hutoa uchambuzi wa michezo pekee. Cheza kwa uwajibikaji kamwe usibet zaidi ya uwezo wako.</p>
        </div>
      </section>
    </main>
  );
}
