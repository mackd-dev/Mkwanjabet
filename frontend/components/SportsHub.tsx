"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../lib/api-client";
import { authenticatedApiRequest, getCurrentUser, type SessionUser } from "../lib/session";

type Market = { id: string; outcomeId: string; label: string; name: string; odds: number };
type Event = {
  id: string; sport: string; country: string; league: string; time: string; minute?: string;
  home: string; away: string; score?: string; markets: Market[]; more: number; live?: boolean;
};
type Selection = {
  id: string;
  eventId: string;
  sport: string;
  league: string;
  match: string;
  marketId: string;
  market: string;
  outcomeId: string;
  pick: string;
  odds: number;
};
type ApiOutcome = { id: string; key: string; name: string; currentOdds: string | number | null };
type ApiMarket = { id: string; key: string; name: string; outcomes: ApiOutcome[] };
type ApiEvent = {
  id: string; slug: string; name: string; startsAt: string; status: string; liveClock?: string | null;
  homeTeamName?: string | null; awayTeamName?: string | null; homeScore?: number | null; awayScore?: number | null;
  sport?: { name: string } | null; country?: { name: string } | null; competition?: { name: string } | null;
  markets: ApiMarket[];
};
type ValidationPreview = { status: "READY"|"WARNING"|"INVALID"; valid: boolean; errors: string[]; warnings: string[]; totalOdds: number; potentialReturnTzs: number; message: string };
type Wallet = { availableBalanceTzs: number };
type PlacedBet = { id: string; ticketCode: string; potentialReturnTzs: number };
type BookingQuote = { code:string; stakeTzs:number; minimumBookingStakeTzs:number; selectionCount:number; totalOdds:number; potentialReturnTzs:number; availableBalanceTzs:number };
function apiMessage(error: unknown) {
  if (error instanceof ApiError && error.payload && typeof error.payload === "object") {
    const payload = error.payload as { message?: unknown; errors?: unknown };
    if (Array.isArray(payload.errors)) return payload.errors.join(". ");
    if (typeof payload.message === "string") return payload.message;
    if (payload.message && typeof payload.message === "object") {
      const nested = payload.message as { message?: unknown; errors?: unknown };
      if (Array.isArray(nested.errors)) return nested.errors.join(". ");
      if (typeof nested.message === "string") return nested.message;
    }
  }
  return "Request could not be completed. Please try again.";
}
const sportIcons: Record<string,string> = { Football:"⚽", Basketball:"🏀", Tennis:"🎾", Volleyball:"🏐", "Ice Hockey":"◉", "Table Tennis":"◌" };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function toEvent(event: ApiEvent): Event {
  const matchWinner = event.markets.find(m => m.key === "match-winner") ?? event.markets[0];
  const markets = (matchWinner?.outcomes ?? []).slice(0, 3).map(outcome => ({
    id: matchWinner.id,
    outcomeId: outcome.id,
    label: outcome.key === "home" ? "1" : outcome.key === "draw" ? "X" : outcome.key === "away" ? "2" : outcome.name,
    name: outcome.name,
    odds: Number(outcome.currentOdds ?? 0),
  })).filter(m => m.odds > 0);
  const live = event.status === "LIVE";
  return {
    id: event.slug || event.id,
    sport: event.sport?.name ?? "Football",
    country: event.country?.name ?? "Global",
    league: event.competition?.name ?? "Competition",
    time: event.startsAt,
    minute: event.liveClock ?? undefined,
    home: event.homeTeamName ?? event.name.split(" vs ")[0] ?? event.name,
    away: event.awayTeamName ?? event.name.split(" vs ")[1] ?? "Opponent",
    score: event.homeScore != null && event.awayScore != null ? `${event.homeScore} - ${event.awayScore}` : undefined,
    markets,
    more: event.markets.reduce((total, market) => total + market.outcomes.length, 0),
    live,
  };
}

export default function SportsHub({initialTab="prematch"}:{initialTab?:"prematch"|"live"}={}){
  const [tab,setTab]=useState<"prematch"|"live">(initialTab);
  const [sport,setSport]=useState("Football");
  const [query,setQuery]=useState("" );
  const [timeFilter,setTimeFilter]=useState<"all"|"today"|"tomorrow"|"soon">("all");
  const [events,setEvents]=useState<Event[]>([]);
  const [eventsNotice,setEventsNotice]=useState("");
  const [slip,setSlip]=useState<Selection[]>([]);
  const [stake,setStake]=useState(5000);
  const [mobileSlip,setMobileSlip]=useState(false);
  const [oddsAccepted,setOddsAccepted]=useState(true);
  const [bookingInput,setBookingInput]=useState("");
  const [bookingCode,setBookingCode]=useState("");
  const [bookingCopied,setBookingCopied]=useState(false);
  const [bookingQuote,setBookingQuote]=useState<BookingQuote|null>(null);
  const [bookingStake,setBookingStake]=useState("");
  const [bookingModalError,setBookingModalError]=useState("");
  const [slipNotice,setSlipNotice]=useState("");
  const [slipBusy,setSlipBusy]=useState(false);
  const [validation,setValidation]=useState<ValidationPreview|null>(null);
  const [user,setUser]=useState<SessionUser|null>(null);
  const [wallet,setWallet]=useState<Wallet|null>(null);
  const [sessionLoading,setSessionLoading]=useState(true);

  useEffect(()=>{
    let mounted=true;
    apiRequest<ApiEvent[]>("/events").then(data=>{
      if(!mounted)return;
      const next=data.map(toEvent).filter(event=>event.markets.length);
      if(next.length){setEvents(next);setEventsNotice("");}
      else setEventsNotice("No live sportsbook events are available right now.");
    }).catch(()=>{
      if(mounted){setEvents([]);setEventsNotice("Sportsbook events are temporarily unavailable.");}
    });
    return()=>{mounted=false};
  },[]);
  useEffect(()=>{
    let mounted=true;
    getCurrentUser().then(current=>{
      if(!mounted)return;
      setUser(current);
      return authenticatedApiRequest<Wallet>("/wallet/me").then(balance=>{if(mounted)setWallet(balance)}).catch(()=>{if(mounted)setWallet(null)});
    }).catch(()=>{if(mounted){setUser(null);setWallet(null);}}).finally(()=>{if(mounted)setSessionLoading(false)});
    return()=>{mounted=false};
  },[]);

  useEffect(()=>{
    if(sessionLoading||!user)return;
    const params=new URLSearchParams(window.location.search);const code=params.get("booking");
    if(!code)return;
    window.history.replaceState({},"","/sports");
    void loadBookingCode(code);
  },[sessionLoading,user]);
  const sportOptions=useMemo(()=>Array.from(new Set(events.map(event=>event.sport))).map(name=>({name,icon:sportIcons[name]??"•",count:events.filter(event=>event.sport===name).length})),[events]);
  const competitionOptions=useMemo(()=>Array.from(new Set(events.filter(event=>event.sport===sport).map(event=>event.league))).slice(0,8),[events,sport]);
  const visible=events.filter(e=>{
    const tabMatch=tab==="live" ? e.live : !e.live;
    const sportMatch=e.sport===sport;
    const q=`${e.home} ${e.away} ${e.league} ${e.country}`.toLowerCase();
    const now=new Date();const eventDate=new Date(e.time);const startOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());const startOfTomorrow=new Date(startOfToday);startOfTomorrow.setDate(startOfTomorrow.getDate()+1);const endOfTomorrow=new Date(startOfTomorrow);endOfTomorrow.setDate(endOfTomorrow.getDate()+1);
    const timeMatch=timeFilter==="all"||e.live||(timeFilter==="today"&&eventDate>=startOfToday&&eventDate<startOfTomorrow)||(timeFilter==="tomorrow"&&eventDate>=startOfTomorrow&&eventDate<endOfTomorrow)||(timeFilter==="soon"&&eventDate>=now&&eventDate.getTime()-now.getTime()<=3*60*60*1000);
    return tabMatch && sportMatch && timeMatch && q.includes(query.toLowerCase());
  });
  const totalOdds=useMemo(()=>slip.reduce((n,s)=>n*s.odds,1),[slip]);
  const potential=stake*totalOdds;


  const apiSelections=()=>slip.map(s=>({
    eventId:s.eventId,sport:s.sport,league:s.league,
    marketId:s.marketId,outcomeId:s.outcomeId,matchName:s.match,marketName:s.market,selection:s.pick,odds:s.odds
  }));

  const saveBooking=async()=>{
    if(!slip.length)return;
    setSlipBusy(true);setSlipNotice("");
    try{const r=await apiRequest<{code:string}>("/betting/booking",{method:"POST",body:JSON.stringify({selections:apiSelections(),stakeTzs:stake})});setBookingCode(r.code);setBookingInput(r.code);setSlipNotice(`Booking saved: ${r.code}`)}
    catch{setSlipNotice("Could not save booking. Make sure the API is running.")}finally{setSlipBusy(false)}
  };
  const validateTicket=async()=>{
    if(!slip.length)return;
    if(!user){setSlipNotice("Log in to validate this wallet-backed ticket.");return;}
    setSlipBusy(true);setSlipNotice("");setValidation(null);
    try{
      const r=await authenticatedApiRequest<Omit<ValidationPreview,"status"|"warnings"|"message">>("/betting/validate",{method:"POST",body:JSON.stringify({selections:apiSelections(),stakeTzs:stake,bookingCode:bookingCode||undefined,acceptOddsChanges:oddsAccepted})});
      const result:ValidationPreview={...r,status:r.valid?"READY":"INVALID",warnings:[],message:r.valid?"Ticket is ready to place.":r.errors.join(". ")};
      setValidation(result);setSlipNotice(result.message);
    } catch(error){setSlipNotice(apiMessage(error));}finally{setSlipBusy(false)}
  };
  const depositForBet=(required:number,code?:string)=>{
    const available=wallet?.availableBalanceTzs??0;
    const deposit=Math.max(1000,required-available);
    localStorage.setItem("mkwanjabet_pending_bet",JSON.stringify({bookingCode:code||null,stakeTzs:required,selections:code?null:slip}));
    window.location.href="/wallet/deposit?amount="+deposit+"&stake="+required+(code?"&booking="+encodeURIComponent(code):"&resume=1");
  };
  const placeBet=async()=>{
    if(!user){window.location.href="/login?next="+encodeURIComponent("/sports");return;}
    if(!slip.length)return;
    if((wallet?.availableBalanceTzs??0)<stake){if(window.confirm("Your balance is not enough for this stake. Deposit funds now and return to this bet?"))depositForBet(stake);return;}
    if(!window.confirm("Confirm this TZS "+stake.toLocaleString()+" stake? The amount will be deducted from your wallet."))return;
    setSlipBusy(true);setSlipNotice("");
    try{const bet=await authenticatedApiRequest<PlacedBet>("/betting/place",{method:"POST",body:JSON.stringify({selections:apiSelections(),stakeTzs:stake,acceptOddsChanges:oddsAccepted})});const balance=await authenticatedApiRequest<Wallet>("/wallet/me");setWallet(balance);setSlip([]);setValidation(null);setBookingCode("");setBookingInput("");localStorage.removeItem("mkwanjabet_pending_bet");setSlipNotice("Bet placed. Ticket "+bet.ticketCode)}
    catch(error){const msg=apiMessage(error);setValidation(null);setSlipNotice(msg);if(msg.toLowerCase().includes("insufficient"))depositForBet(stake)}finally{setSlipBusy(false)}
  };
  const loadBookingCode=async(rawCode:string)=>{
    const code=rawCode.trim().toUpperCase();if(!code)return;
    if(!user){window.location.href="/login?next="+encodeURIComponent("/sports?booking="+code);return;}
    setSlipBusy(true);setSlipNotice("");
    try{
      const quote=await authenticatedApiRequest<BookingQuote>("/betting/booking/"+encodeURIComponent(code)+"/quote");
      setBookingCode(quote.code);setBookingInput(quote.code);setBookingStake(String(quote.stakeTzs));setBookingModalError("");setBookingQuote(quote);setSlip([]);
    }catch(error){setSlipNotice(apiMessage(error))}finally{setSlipBusy(false)}
  };
  const confirmBooking=async()=>{
    if(!bookingQuote)return;
    const chosenStake=Number(bookingStake);
    if(!Number.isInteger(chosenStake)||chosenStake<bookingQuote.minimumBookingStakeTzs){setBookingModalError("Minimum booking stake is TZS "+bookingQuote.minimumBookingStakeTzs.toLocaleString()+".");return;}
    if(bookingQuote.availableBalanceTzs<chosenStake){depositForBet(chosenStake,bookingQuote.code);return;}
    setSlipBusy(true);setBookingModalError("");
    try{
      const bet=await authenticatedApiRequest<PlacedBet>("/betting/booking/"+encodeURIComponent(bookingQuote.code)+"/place",{method:"POST",body:JSON.stringify({stakeTzs:chosenStake,acceptOddsChanges:true})});
      const balance=await authenticatedApiRequest<Wallet>("/wallet/me");setWallet(balance);setBookingQuote(null);setBookingCode("");setBookingInput("");localStorage.removeItem("mkwanjabet_pending_bet");setSlipNotice("Booking placed. Ticket "+bet.ticketCode);
    }catch(error){setBookingModalError(apiMessage(error))}finally{setSlipBusy(false)}
  };
  const loadBooking=()=>loadBookingCode(bookingInput);
  const copyBookingCode=async()=>{
    if(!bookingCode)return;
    try{
      if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(bookingCode);
      else{const input=document.createElement("textarea");input.value=bookingCode;input.setAttribute("readonly","");input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();if(!document.execCommand("copy"))throw new Error("Copy failed");document.body.removeChild(input);}
      setBookingCopied(true);setSlipNotice("Booking code copied.");window.setTimeout(()=>setBookingCopied(false),2000);
    }catch{setBookingCopied(false);setSlipNotice("Could not copy automatically. Select the booking code and copy it manually.");}
  };


  const toggle=(e:Event,m:Market)=>{
    const id=`${e.id}-${m.outcomeId}`;
    const next={id,eventId:e.id,sport:e.sport,league:e.league,match:`${e.home} vs ${e.away}`,marketId:m.id,market:"Match result",outcomeId:m.outcomeId,pick:m.name,odds:m.odds};
    setSlip(x=>x.some(s=>s.id===id)?x.filter(s=>s.id!==id):[...x.filter(s=>s.eventId!==e.id&&s.marketId!==m.id),next]);
  };

  const BetSlip = ({mobile=false}:{mobile?:boolean}) => <aside className={`betslip ${mobile?"mobile-slip-panel":""}`}>
    {mobile && <button className="slip-close" onClick={()=>setMobileSlip(false)}>×</button>}
    <div className="betslip-tabs"><button className="active">Betslip <b>{slip.length}</b></button><Link href="/my-bets">My Bets</Link></div>
    {!slip.length?<div className="empty-slip"><span>＋</span><h3>Your betslip is empty</h3><p>Select odds from any event to build your ticket.</p><div><b>Booking code</b><div className="booking-row"><input value={bookingInput} onChange={e=>setBookingInput(e.target.value.toUpperCase())} placeholder="Enter booking code"/><button disabled={slipBusy} onClick={loadBooking}>Load</button></div>{slipNotice&&<small className="slip-notice">{slipNotice}</small>}</div></div>:<>
      <div className="slip-topline"><span>Accumulator</span><button onClick={()=>setSlip([])}>Clear all</button></div>{slipNotice&&<div className="slip-notice">{slipNotice}</div>}
      <div className="slip-items">{slip.map(s=><article key={s.id}><button aria-label="Remove selection" onClick={()=>setSlip(x=>x.filter(v=>v.id!==s.id))}>×</button><small>{s.market}</small><strong>{s.pick} · {s.match}</strong><div><span>Odds</span><b>{s.odds.toFixed(2)}</b></div></article>)}</div>
      <div className="slip-summary">
        <label>Stake (TZS)<input type="number" min="0" value={stake} onChange={e=>setStake(Number(e.target.value)||0)}/></label>
        <div className="quick-stakes">{[1000,2000,5000,10000].map(v=><button key={v} onClick={()=>setStake(v)}>+{v/1000}K</button>)}</div>
        <p><span>Total odds</span><b>{totalOdds.toFixed(2)}</b></p><p><span>Potential payout</span><b>TZS {potential.toLocaleString("en-US",{maximumFractionDigits:0})}</b></p>
        <label className="odds-change"><input type="checkbox" checked={oddsAccepted} onChange={e=>setOddsAccepted(e.target.checked)}/> Accept odds changes</label>
        <button className="booking-save-btn" disabled={slipBusy||!slip.length} onClick={validateTicket}>{slipBusy?"Working...":"Validate ticket"}</button>
        {validation&&<div className={`ticket-validation ${validation.status.toLowerCase()}`}><b>{validation.status}</b><span>{validation.message}</span>{[...validation.errors,...validation.warnings].slice(0,3).map(x=><small key={x}>{x}</small>)}</div>}
        <button className="booking-save-btn" disabled={slipBusy||!slip.length} onClick={saveBooking}>{slipBusy?"Working...":"Save booking code"}</button>{bookingCode&&<div className="saved-code"><span>Booking code</span><b>{bookingCode}</b><button onClick={copyBookingCode}>{bookingCopied?"Copied":"Copy"}</button></div>}<button className="place-bet-btn" disabled={slipBusy||!slip.length} onClick={placeBet}>{slipBusy?"Working...":user?"Place bet":"Log in to place bet"}</button>
        <small>18+ · Play responsibly. Stakes are deducted from your wallet when a ticket is accepted.</small>
      </div>
    </>}
  </aside>;

  return <main className="sports-shell">
    {bookingQuote&&<div className="booking-modal-backdrop" role="presentation" onMouseDown={()=>!slipBusy&&setBookingQuote(null)}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" onMouseDown={e=>e.stopPropagation()}><header><div><span>SECURE BOOKING</span><h2 id="booking-modal-title">Confirm your ticket</h2></div><button aria-label="Close" onClick={()=>setBookingQuote(null)} disabled={slipBusy}>×</button></header><div className="booking-modal-code"><span>Booking code</span><strong>{bookingQuote.code}</strong><small>Picks remain hidden until this wallet-backed ticket is accepted.</small></div><div className="booking-modal-stats"><div><span>Selections</span><b>{bookingQuote.selectionCount}</b></div><div><span>Total odds</span><b>{bookingQuote.totalOdds.toFixed(2)}</b></div><div><span>Potential return</span><b>TZS {Math.floor((Number(bookingStake)||0)*bookingQuote.totalOdds).toLocaleString()}</b></div></div><label className="booking-modal-stake"><span>Your stake · Minimum TZS {bookingQuote.minimumBookingStakeTzs.toLocaleString()}</span><div><b>TZS</b><input autoFocus type="number" min={bookingQuote.minimumBookingStakeTzs} step="500" value={bookingStake} onChange={e=>{setBookingStake(e.target.value);setBookingModalError("")}}/></div></label><div className="booking-modal-balance"><span>Available balance</span><b>TZS {bookingQuote.availableBalanceTzs.toLocaleString()}</b></div>{bookingQuote.availableBalanceTzs<(Number(bookingStake)||0)&&<div className="booking-modal-warning"><b>Deposit required</b><span>You need TZS {Math.max(0,(Number(bookingStake)||0)-bookingQuote.availableBalanceTzs).toLocaleString()} more. Deposited funds stay in your wallet until you return and confirm.</span></div>}{bookingModalError&&<div className="booking-modal-error">{bookingModalError}</div>}<footer><button className="secondary" onClick={()=>setBookingQuote(null)} disabled={slipBusy}>Cancel</button><button className={bookingQuote.availableBalanceTzs<(Number(bookingStake)||0)?"deposit":"confirm"} onClick={confirmBooking} disabled={slipBusy}>{slipBusy?"Processing...":bookingQuote.availableBalanceTzs<(Number(bookingStake)||0)?"Deposit funds":"Confirm & place bet"}</button></footer><p>Current odds, account limits, and wallet balance are revalidated before acceptance.</p></section></div>}

    <header className="sports-topbar">
      <Link className="sports-brand" href="/"><span>M</span>Mkwanja<b>Bet</b></Link>
      <nav><Link className={tab==="prematch"?"active":""} href="/sports">Sports</Link><Link className={tab==="live"?"active":""} href="/live">Live</Link><Link href="/results">Results</Link><Link href="/responsible-play">Responsible play</Link></nav>
      <div className="sports-actions"><Link className="wallet-preview" href={user?"/dashboard":"/login?next=/sports"}><small>Balance</small><b>TZS {(wallet?.availableBalanceTzs??0).toLocaleString("en-US")}</b></Link>{sessionLoading?<span className="sports-session-loading">Checking session...</span>:user?<Link className="sports-register" href="/dashboard">My account</Link>:<><Link href="/login?next=/sports">Log in</Link><Link className="sports-register" href="/register">Register</Link></>}</div>
    </header>
    <div className="sports-mainnav">
      <Link className={tab==="prematch"?"active":""} href="/sports">Sports</Link><Link className={tab==="live"?"active":""} href="/live">Live</Link><Link href="/my-bets">My bets</Link><Link href="/results">Results</Link><Link href="/wallet/deposit">Deposit</Link>
    </div>
    <section className="ticker"><b>IN PLAY</b>{Array.from(new Set(events.map(event=>event.league))).slice(0,6).map(league=><span key={league}>{league}</span>)}{!events.length&&<span>Waiting for event feed</span>}</section>
    <section className="sports-layout">
      <aside className="sports-left">
        <h3>Sports</h3>
        {sportOptions.map(({name,icon,count})=><button key={name} onClick={()=>setSport(name)} className={sport===name?"active":""}><span>{icon}</span>{name}<small>{count}</small></button>)}
        <h3>Popular competitions</h3>
        {competitionOptions.length?competitionOptions.map(x=><button key={x} onClick={()=>setQuery(x)}><span>☆</span>{x}</button>):<small className="sports-empty-competitions">No competitions available</small>}
        <div className="sidebar-help"><b>Need help?</b><p>Visit support or learn about responsible play.</p><Link href="/contact">Support centre</Link></div>
      </aside>
      <section className="sports-content">
        <div className="sports-hero"><div><span>MKWANJABET SPORTSBOOK</span><h1>Live odds.<br/>One secure wallet.</h1><p>Browse current events, build your ticket and track every wallet-backed bet from one account.</p><div className="hero-actions-mini"><Link href="#events">Explore events</Link><Link href="/responsible-play">Play responsibly</Link></div></div><div className="hero-jackpot"><small>YOUR ACCOUNT</small><b>{user?`TZS ${(wallet?.availableBalanceTzs??0).toLocaleString("en-US")}`:"Start betting"}</b><span>{user?"Available wallet balance":"Create an account to fund your wallet and place tickets"}</span><Link href={user?"/wallet/deposit":"/register"}>{user?"Deposit funds":"Register now"} →</Link></div></div>
        <div className="promo-cards"><article><span>LIVE</span><b>Current event odds</b><small>Markets loaded from the sportsbook API</small></article><article><span>SAFE</span><b>Wallet-backed tickets</b><small>Every stake and payout is recorded</small></article><article><span>FAST</span><b>Instant booking</b><small>Save and restore a ticket by code</small></article></div>
        <div className="sports-toolbar"><div><button onClick={()=>setTab("prematch")} className={tab==="prematch"?"active":""}>Pre-match</button><button onClick={()=>setTab("live")} className={tab==="live"?"active":""}><i/> Live now</button></div><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search team, league or country"/></label></div>
        <div className="quick-filters">{[["all","All"],["today","Today"],["tomorrow","Tomorrow"],["soon","Starting soon"]].map(([key,label])=><button onClick={()=>setTimeFilter(key as typeof timeFilter)} className={timeFilter===key?"active":""} key={key}>{label}</button>)}</div>
        {eventsNotice&&<div className="sports-data-notice">{eventsNotice}</div>}
        <div className="market-labels"><span>{tab==="live"?"Live events":"Featured events"}</span><div><b>1</b><b>X</b><b>2</b><b>More</b></div></div>
        <div className="event-list" id="events">
          {visible.length===0&&<div className="no-events"><b>No events found</b><span>Try another sport, tab or search.</span></div>}
          {visible.map(e=><article className="event-card" key={e.id}>
            <div className="event-meta"><small><b>{e.country}</b> · {e.league}</small><div><button>☆</button><time>{e.live?<><i/> LIVE {e.minute}</>:formatTime(e.time)}</time></div></div>
            <div className="event-body"><Link className="teams" href={`/sports/match/${e.id}`}><div><strong>{e.home}</strong><span>{e.live&&e.score?.split(" - ")[0]}</span></div><div><strong>{e.away}</strong><span>{e.live&&e.score?.split(" - ")[1]}</span></div><small>{e.live?"Live match result":"Match result"}</small></Link><div className="odds-grid">{e.markets.map(m=>{const id=`${e.id}-${m.outcomeId}`;return <button key={m.outcomeId} className={slip.some(s=>s.id===id)?"selected":""} onClick={()=>toggle(e,m)}><span>{m.label}</span><b>{m.odds.toFixed(2)}</b></button>})}<button className="more">+{e.more}</button></div></div>
            <div className="event-footer"><button>▥ Stats</button><button>◉ Live tracker</button><span>{e.more} markets available</span></div>
          </article>)}
        </div>
        <div className="responsible-strip"><b>18+</b><span><strong>Bet responsibly.</strong> Set limits, take breaks and never chase losses.</span><Link href="/responsible-play">Responsible gaming</Link></div>
      </section>
      <BetSlip/>
    </section>
    <nav className="sports-mobile-nav"><Link href="/sports"><span>⚽</span>Sports</Link><Link href="/live"><span>●</span>Live</Link><button className="mobile-slip-button" onClick={()=>setMobileSlip(true)}><span>▤</span>Betslip<b>{slip.length}</b></button><Link href="/results"><span>✓</span>Results</Link><Link href="/dashboard"><span>◎</span>Account</Link></nav>
    {mobileSlip&&<div className="mobile-slip-wrap"><div className="mobile-slip-scrim" onClick={()=>setMobileSlip(false)}/><BetSlip mobile/></div>}    <footer className="sports-footer">
      <div><Link className="sports-brand" href="/"><span>M</span>Mkwanja<b>Bet</b></Link><p>Secure, wallet-backed sports betting built for Tanzania.</p></div>
      <nav><Link href="/sports">Sports</Link><Link href="/my-bets">My bets</Link><Link href="/wallet/deposit">Deposit</Link><Link href="/contact">Support</Link></nav>
      <nav><Link href="/responsible-play">Responsible gaming</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/disclaimer">Rules</Link></nav>
      <div className="sports-footer-trust"><b>18+ only</b><span>Play responsibly. Never bet more than you can afford to lose.</span><small>© 2026 MkwanjaBet. All rights reserved.</small></div>
    </footer>
  </main>
}
