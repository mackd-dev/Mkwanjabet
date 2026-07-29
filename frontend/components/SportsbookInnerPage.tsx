import Link from "next/link";

const content = {
  live:{eyebrow:"LIVE CENTRE",title:"Follow every moment live",desc:"Live scores, match clocks, changing markets and quick betslip access in one focused screen.",cards:["Live football","Live basketball","Live tennis"]},
  jackpot:{eyebrow:"MKWANJABET JACKPOT",title:"One ticket. Life-changing potential.",desc:"Predict the outcome of selected matches, save your ticket and track every result from one place.",cards:["Weekly 15","Midweek 12","Mini jackpot"]},
  promotions:{eyebrow:"PROMOTIONS",title:"More value on the games you love",desc:"A dedicated home for welcome offers, boosted odds, free bets, cashback and loyalty rewards.",cards:["Welcome offer","Odds boost","Accumulator bonus"]},
  bets:{eyebrow:"MY BETS",title:"Every ticket, clearly organised",desc:"Track open, settled, cashed-out and saved tickets with full transaction-level detail.",cards:["Open bets","Settled bets","Booking codes"]},
  deposit:{eyebrow:"WALLET",title:"Deposit funds securely",desc:"Mobile-money and banking integrations will appear here after production onboarding and approval.",cards:["M-Pesa","Mixx by Yas","Airtel Money"]},
  withdraw:{eyebrow:"WALLET",title:"Withdraw your winnings",desc:"A clear withdrawal flow with account verification, status tracking and transparent limits.",cards:["Verified account","Withdrawal status","Transaction history"]},
} as const;

export default function SportsbookInnerPage({type}:{type:keyof typeof content}){
 const c=content[type];
 return <main className="sb-inner"><header><Link className="sports-brand" href="/"><span>M</span>Mkwanja<b>Bet</b></Link><nav><Link href="/sports">Sports</Link><Link href="/live">Live</Link><Link href="/jackpot">Jackpots</Link><Link href="/promotions">Promotions</Link></nav><Link className="sports-register" href="/register">Register</Link></header><section className="sb-inner-hero"><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.desc}</p><div><Link href="/sports">Browse sports</Link><Link href="/login">Log in</Link></div></section><section className="sb-feature-grid">{c.cards.map((x,i)=><article key={x}><small>0{i+1}</small><h2>{x}</h2><p>Production-ready interface placeholder prepared for API, wallet and compliance integration.</p><button>Coming next</button></article>)}</section><div className="sb-build-note"><b>V13 foundation</b><span>This screen is ready for the next backend integration sprint.</span></div></main>
}
