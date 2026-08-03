"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register" | "forgot" | "verify";

type Props = { mode: Mode };

const content = {
  login: {
    eyebrow: "KARIBU TENA",
    title: "Ingia kwenye PrimeOdds.",
    copy: "Fungua picks zako, subscription na historia ya akaunti yako.",
    submit: "Ingia kwenye Akaunti",
  },
  register: {
    eyebrow: "ANZA SASA",
    title: "Fungua akaunti yako.",
    copy: "Jiunge na PrimeOdds, hifadhi picks na ufungue Premium kwa urahisi.",
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
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Prime<span>Odds</span></span></Link>
        <Link className="auth-back" href="/">← Rudi Nyumbani</Link>
      </header>

      <section className="auth-layout">
        <aside className="auth-showcase">
          <div className="auth-showcase-glow"></div>
          <span className="eyebrow">ENEO LA WANACHAMA WA PRIMEODDS</span>
          <h2>Picks zako.<br/><em>Sehemu moja salama.</em></h2>
          <p>Ingia kuona picks za leo, uanachama wako, arifa na historia ya matokeo.</p>
          <div className="auth-feature-list">
            <article><i>01</i><div><b>Ufikiaji wa Premium</b><span>Fungua picks na uchambuzi uliolipia.</span></div></article>
            <article><i>02</i><div><b>Hifadhi Picks</b><span>Rudi kwenye mechi muhimu bila kuitafuta tena.</span></div></article>
            <article><i>03</i><div><b>Arifa Muhimu</b><span>Pata taarifa picks mpya zinapowekwa.</span></div></article>
          </div>
          <div className="auth-mini-card">
            <div><span>UHAKIKA WA PICK</span><strong>91%</strong></div>
            <i><u></u></i>
            <small>Uchambuzi wa kina · Kiwango cha hatari · Odds zenye thamani</small>
          </div>
        </aside>

        <div className="auth-panel-wrap">
          <div className="auth-panel">
            <span className="eyebrow">{page.eyebrow}</span>
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
          <p className="auth-disclaimer">PrimeOdds hutoa uchambuzi wa michezo pekee. Cheza kwa uwajibikaji.</p>
        </div>
      </section>
    </main>
  );
}
