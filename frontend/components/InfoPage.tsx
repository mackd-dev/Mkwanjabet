import Link from "next/link";

type PageKind = "about" | "contact" | "responsible" | "terms" | "privacy" | "disclaimer";

const content: Record<PageKind, { eyebrow: string; title: string; intro: string; sections: { title: string; body: string }[] }> = {
  about: { eyebrow: "KUHUSU MKWANJABET", title: "Uchambuzi wa mpira ulio wazi na wa kisasa.", intro: "MkwanjaBet ni jukwaa la taarifa na uchambuzi wa michezo linalowasaidia watumiaji kuelewa mechi kwa urahisi kabla ya kufanya maamuzi yao wenyewe.", sections: [
    { title: "Dhamira yetu", body: "Tunataka kuleta picks, takwimu na mantiki ya uchambuzi katika sehemu moja yenye muonekano rahisi, wa haraka na unaoaminika." },
    { title: "Uwazi kwanza", body: "Kila pick iliyochapishwa inabaki kwenye historia pamoja na matokeo yake. Hatufichi picks zilizopotea wala kubadilisha rekodi baada ya mechi." },
    { title: "Imejengwa kwa Tanzania", body: "Lugha, malipo, matumizi ya simu na uzoefu wa jukwaa umeundwa kwa kuzingatia watumiaji wa Tanzania." },
  ]},
  contact: { eyebrow: "WASILIANA NASI", title: "Tuko hapa kukusaidia.", intro: "Una swali kuhusu account, subscription, malipo au pick? Tuma ujumbe na timu yetu ya msaada itakujibu.", sections: [
    { title: "Msaada wa account", body: "Kwa masuala ya kuingia, OTP, kubadilisha namba au usalama wa account, tumia support@mkwanjabet.co.tz." },
    { title: "Malipo na subscription", body: "Weka namba ya kumbukumbu ya malipo unapowasiliana nasi ili tuweze kukusaidia kwa haraka." },
    { title: "Saa za huduma", body: "Jumatatu hadi Jumapili, saa 2:00 asubuhi hadi saa 5:00 usiku kwa saa za Afrika Mashariki." },
  ]},
  responsible: { eyebrow: "CHEZA KWA UWAJIBIKAJI", title: "Maarifa kwanza. Udhibiti daima.", intro: "MkwanjaBet hutoa uchambuzi na mapendekezo pekee. Hakuna pick, odds au kiwango cha uhakika kinachoweza kuhakikisha matokeo ya mechi.", sections: [
    { title: "Weka kiwango chako", body: "Tumia fedha unazoweza kumudu kupoteza. Usitumie fedha za kodi, chakula, ada, deni au mahitaji muhimu." },
    { title: "Usifukuze hasara", body: "Kupoteza ni sehemu ya hatari. Kuongeza dau ili kurudisha hasara kunaweza kuongeza tatizo badala ya kulitatua." },
    { title: "Pumzika inapohitajika", body: "Weka muda wa matumizi na chukua mapumziko unapohisi hasira, presha au kushindwa kujizuia." },
  ]},
  terms: { eyebrow: "MASHARTI YA MATUMIZI", title: "Masharti yanayolinda pande zote.", intro: "Kwa kutumia MkwanjaBet unakubali kutumia jukwaa kwa njia halali, kuwajibika kwa maamuzi yako na kuheshimu masharti ya subscription.", sections: [
    { title: "Huduma ya taarifa", body: "MkwanjaBet si bookmaker na haipokei dau. Tunatoa maudhui ya uchambuzi, takwimu na mapendekezo ya michezo." },
    { title: "Account na usalama", body: "Unawajibika kulinda taarifa zako za kuingia na kutoruhusu mtu mwingine kutumia akaunti yako bila idhini." },
    { title: "Subscription", body: "Ufikiaji wa Premium hutolewa kwa muda wa mpango uliolipiwa. Bei na vipengele vinaweza kubadilishwa kwa taarifa inayofaa." },
  ]},
  privacy: { eyebrow: "SERA YA FARAGHA", title: "Taarifa zako zinatumika kwa uwazi.", intro: "Tunakusanya taarifa chache zinazohitajika kuendesha account, malipo, usalama na mawasiliano ya huduma.", sections: [
    { title: "Taarifa tunazokusanya", body: "Jina, namba ya simu, email, historia ya subscription, kifaa na matukio muhimu ya usalama wa account." },
    { title: "Jinsi tunavyotumia taarifa", body: "Kufungua huduma, kuthibitisha malipo, kutuma arifa ulizochagua na kuzuia matumizi mabaya ya jukwaa." },
    { title: "Udhibiti wako", body: "Unaweza kubadilisha taarifa na mapendeleo ya arifa, au kuomba akaunti yako ifutwe kupitia sehemu ya Wasifu." },
  ]},
  disclaimer: { eyebrow: "TAHADHARI", title: "Hakuna matokeo yanayohakikishwa.", intro: "Takwimu za zamani, odds na confidence score hazihakikishi matokeo yajayo. Matokeo ya michezo yanaweza kubadilika kwa sababu nyingi zisizotabirika.", sections: [
    { title: "Maamuzi ni yako", body: "Maudhui ya MkwanjaBet hayapaswi kuchukuliwa kama ushauri wa kifedha. Mtumiaji anawajibika kwa maamuzi na matokeo yake." },
    { title: "Taarifa za wahusika wengine", body: "Baadhi ya ratiba, odds na takwimu zinaweza kutoka kwa vyanzo vya nje na zinaweza kubadilika bila taarifa." },
    { title: "Umri unaoruhusiwa", body: "Huduma inakusudiwa kwa watu wenye umri unaoruhusiwa kisheria katika eneo lao." },
  ]},
};

export default function InfoPage({ kind }: { kind: PageKind }) {
  const page = content[kind];
  return <main className="info-page">
    <header className="info-nav"><Link className="brand" href="/"><img src="/brand/logos/02-primary-logo-light.svg" alt="MkwanjaBet"/><span className="sr-only">MkwanjaBet</span></Link><nav><Link href="/sports">Sports</Link><Link href="/live">Live</Link><Link href="/my-bets">My bets</Link><Link className="btn btn-small btn-gold" href="/login">Ingia</Link></nav></header>
    <section className="info-hero"><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></section>
    <section className="info-content">
      {page.sections.map((section, index) => <article key={section.title}><span>0{index + 1}</span><div><h2>{section.title}</h2><p>{section.body}</p></div></article>)}
      {kind === "contact" && <form className="contact-form"><div><label>Jina<input placeholder="Jina lako" /></label><label>Namba ya simu<input placeholder="+255 7xx xxx xxx" /></label></div><label>Email<input type="email" placeholder="wewe@example.com" /></label><label>Ujumbe<textarea rows={6} placeholder="Tueleze tunavyoweza kukusaidia..." /></label><button className="btn btn-gold" type="button">Tuma Ujumbe →</button></form>}
    </section>
    <section className="info-cta"><h2>Rudi kwenye mchezo.</h2><p>Browse current events or open your secure MkwanjaBet account.</p><div><Link className="btn btn-gold" href="/sports">Browse sports →</Link><Link className="btn btn-outline" href="/dashboard">Dashibodi</Link></div></section>
    <footer className="info-footer"><span>© 2026 MkwanjaBet</span><div><Link href="/terms">Masharti</Link><Link href="/privacy">Faragha</Link><Link href="/disclaimer">Tahadhari</Link></div></footer>
  </main>;
}
