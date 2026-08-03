"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type PlanId = "day" | "week" | "month";
type MethodId = "mpesa" | "mixx" | "airtel" | "halopesa";

const plans = [
  { id: "day" as PlanId, name: "Prime Siku", price: 2000, duration: "Saa 24", note: "Kwa picks za leo" },
  { id: "week" as PlanId, name: "Prime Wiki", price: 10000, duration: "Siku 7", note: "Chaguo maarufu" },
  { id: "month" as PlanId, name: "Prime Mwezi", price: 20000, duration: "Siku 30", note: "Thamani bora" },
];

const methods = [
  { id: "mpesa" as MethodId, name: "M-Pesa", short: "M" },
  { id: "mixx" as MethodId, name: "Mixx by Yas", short: "Y" },
  { id: "airtel" as MethodId, name: "Airtel Money", short: "A" },
  { id: "halopesa" as MethodId, name: "HaloPesa", short: "H" },
];

export default function CheckoutPage() {
  const [planId, setPlanId] = useState<PlanId>("week");
  const [methodId, setMethodId] = useState<MethodId>("mpesa");
  const [phone, setPhone] = useState("0712 345 678");
  const [step, setStep] = useState<"details" | "processing" | "success">("details");
  const plan = useMemo(() => plans.find((item) => item.id === planId)!, [planId]);
  const method = useMemo(() => methods.find((item) => item.id === methodId)!, [methodId]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setStep("processing");
    window.setTimeout(() => setStep("success"), 1800);
  }

  return <main className="checkout-page">
    <header className="checkout-nav">
      <Link className="brand" href="/"><span className="brand-mark">P</span><span>Mkwanja<span>Bet</span></span></Link>
      <div><span>Malipo salama</span><i>✓</i></div>
    </header>

    {step === "success" ? <section className="checkout-status-card success">
      <i>✓</i><span className="eyebrow">MALIPO YAMEKAMILIKA</span><h1>Karibu Prime, Asha!</h1>
      <p>Mpango wako wa <strong>{plan.name}</strong> umefunguliwa. Sasa unaweza kuona picks zote za Premium na uchambuzi kamili.</p>
      <div className="checkout-receipt"><div><span>Mpango</span><strong>{plan.name}</strong></div><div><span>Kiasi</span><strong>TZS {plan.price.toLocaleString()}</strong></div><div><span>Njia</span><strong>{method.name}</strong></div><div><span>Namba ya kumbukumbu</span><strong>PO-260729-9341</strong></div></div>
      <Link className="btn btn-gold full" href="/dashboard">Fungua Dashibodi →</Link>
      <Link className="checkout-text-link" href="/picks">Angalia Picks za Leo</Link>
    </section> : step === "processing" ? <section className="checkout-status-card processing">
      <i className="checkout-spinner"></i><span className="eyebrow">INASUBIRI UTHIBITISHO</span><h1>Thibitisha kwenye simu yako.</h1>
      <p>Ombi la malipo limetumwa kwenye <strong>{phone}</strong>. Weka PIN yako ya {method.name} kukamilisha malipo.</p>
      <div className="checkout-wait"><span></span><span></span><span></span></div>
      <button onClick={() => setStep("details")}>Badilisha taarifa za malipo</button>
    </section> : <section className="checkout-shell">
      <div className="checkout-main">
        <Link className="checkout-back" href="/premium">← Rudi kwenye mipango</Link>
        <span className="eyebrow">MALIPO YA PRIME</span><h1>Kamilisha subscription yako.</h1><p>Chagua mpango na njia ya malipo. Premium itafunguka mara tu malipo yakithibitishwa.</p>

        <form onSubmit={submit}>
          <section className="checkout-block"><div className="checkout-block-title"><b>1</b><div><h2>Chagua mpango</h2><p>Unaweza kubadilisha au kuongeza muda baadaye.</p></div></div>
            <div className="checkout-plan-grid">{plans.map((item) => <button type="button" key={item.id} className={planId === item.id ? "active" : ""} onClick={() => setPlanId(item.id)}><span>{item.note}</span><strong>{item.name}</strong><b>TZS {item.price.toLocaleString()}</b><small>{item.duration}</small><i>{planId === item.id ? "✓" : ""}</i></button>)}</div>
          </section>

          <section className="checkout-block"><div className="checkout-block-title"><b>2</b><div><h2>Njia ya malipo</h2><p>Chagua mtandao wa namba utakayotumia.</p></div></div>
            <div className="checkout-methods">{methods.map((item) => <button type="button" key={item.id} className={methodId === item.id ? "active" : ""} onClick={() => setMethodId(item.id)}><i>{item.short}</i><span>{item.name}</span><b>{methodId === item.id ? "✓" : ""}</b></button>)}</div>
            <label className="checkout-phone"><span>Namba ya simu ya malipo</span><div><b>+255</b><input required value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" /></div><small>Utapokea ombi la kuweka PIN kwenye simu hii.</small></label>
          </section>
          <button className="btn btn-gold full checkout-submit" type="submit">Lipa TZS {plan.price.toLocaleString()} →</button>
          <p className="checkout-consent">Kwa kuendelea unakubali <Link href="/terms">Masharti ya Matumizi</Link> na <Link href="/privacy">Sera ya Faragha</Link>.</p>
        </form>
      </div>

      <aside className="checkout-summary">
        <span className="eyebrow">MUHTASARI</span><h2>Order yako</h2>
        <div className="summary-plan"><i>P</i><div><strong>{plan.name}</strong><span>Ufikiaji wa Premium · {plan.duration}</span></div><b>TZS {plan.price.toLocaleString()}</b></div>
        <ul><li>Picks zote za Premium <b>✓</b></li><li>Uchambuzi kamili wa mechi <b>✓</b></li><li>Arifa za picks na matokeo <b>✓</b></li><li>Hakuna malipo ya ziada <b>✓</b></li></ul>
        <div className="summary-total"><span>Jumla</span><strong>TZS {plan.price.toLocaleString()}</strong></div>
        <div className="summary-security"><i>⌾</i><div><strong>Malipo yako yanalindwa</strong><span>MkwanjaBet haihifadhi PIN yako.</span></div></div>
      </aside>
    </section>}
  </main>;
}
