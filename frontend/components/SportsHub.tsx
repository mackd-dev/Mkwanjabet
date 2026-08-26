"use client";

import Link from "next/link";
import AuthModal from "./AuthModal";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../lib/api-client";
import { authenticatedApiRequest, getCurrentUser, type SessionUser } from "../lib/session";
import { loadSlip, saveSlip, type SlipSelection } from "../lib/betslip";
import { sanitizeAmountInput } from "../lib/format";

type Market = { id: string; outcomeId: string; label: string; name: string; odds: number };
type Event = {
  id: string; sport: string; country: string; league: string; time: string; minute?: string;
  home: string; away: string; score?: string; markets: Market[]; more: number; live?: boolean;
  homeLogo?: string; awayLogo?: string; leagueLogo?: string; bannerLogo?: string;
};
type Selection = SlipSelection;
type ApiOutcome = { id: string; key: string; name: string; currentOdds: string | number | null };
type ApiMarket = { id: string; key: string; name: string; outcomes: ApiOutcome[] };
type ApiEvent = {
  id: string; slug: string; name: string; startsAt: string; status: string; liveClock?: string | null;
  homeTeamName?: string | null; awayTeamName?: string | null; homeScore?: number | null; awayScore?: number | null;
  sport?: { name: string } | null; country?: { name: string } | null; competition?: { name: string; logoUrl?: string | null } | null;
  homeTeam?: { logoUrl?: string | null } | null; awayTeam?: { logoUrl?: string | null } | null;
  markets: ApiMarket[];
};
type ValidationPreview = { status: "READY"|"WARNING"|"INVALID"; valid: boolean; errors: string[]; warnings: string[]; totalOdds: number; potentialReturnTzs: number; message: string };
type Wallet = { availableBalanceTzs: number };
type ApiTransaction = { reference:string; status:string };
type PlacedBet = { id: string; ticketCode: string; potentialReturnTzs: number };
type BookingQuote = { code:string; stakeTzs:number; minimumBookingStakeTzs:number; selectionCount:number; totalOdds:number; potentialReturnTzs:number; availableBalanceTzs:number };
type BetPrompt = { kind:"deposit"|"confirm"; title:string; message:string; primary:string; secondary:string; stakeTzs:number };
type AccountBet = { id:string; betId:string; bookingCode?:string; type:"Single"|"Accumulator"; status:"Open"|"Won"|"Lost"|"Void"|"Cashed out"; rawStatus:string; stake:number; odds:number; returnAmount:number; cashOut?:number; date:string; settledAt?:string; selections:{eventId:string;marketId:string;outcomeId:string;match:string;market:string;pick:string;odd:number;state:string}[] };
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
const sportIcons: Record<string,string> = { Football:"⚽", Basketball:"🏀", Tennis:"🎾", Baseball:"◆", Cricket:"●", Volleyball:"🏐", "Ice Hockey":"◉", "Table Tennis":"◌" };
const POPULAR_COUNTRIES = [
  {value:"England",label:"England"}, {value:"Spain",label:"Spain"}, {value:"Italy",label:"Italy"},
  {value:"Germany",label:"Germany"}, {value:"France",label:"France"}, {value:"Portugal",label:"Portugal"},
  {value:"World",label:"European cups"}, {value:"Netherlands",label:"Netherlands"},
  {value:"Belgium",label:"Belgium"}, {value:"Turkey",label:"Turkiye"}, {value:"Brazil",label:"Brazil"},
  {value:"Argentina",label:"Argentina"}, {value:"USA",label:"United States"},
];
function countryPriority(country:string) {
  const index=POPULAR_COUNTRIES.findIndex(item=>item.value.toLowerCase()===country.trim().toLowerCase());
  return index===-1?999:index;
}
const POPULAR_LEAGUES = [
  "UEFA Champions League", "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1",
  "UEFA Europa League", "Primeira Liga", "Eredivisie", "Jupiler Pro League", "Super Lig",
  "Championship", "Brasileirao Serie A", "MLS",
];
function leaguePriority(league: string) {
  const index = POPULAR_LEAGUES.findIndex(name => name.toLowerCase() === league.trim().toLowerCase());
  return index === -1 ? 999 : index;
}
const depositMethods=[{name:"M-Pesa",code:"MP",provider:"MPESA",hint:"Vodacom"},{name:"Mixx by Yas",code:"MY",provider:"MIXX_BY_YAS",hint:"Yas"},{name:"Airtel Money",code:"AM",provider:"AIRTEL_MONEY",hint:"Airtel"},{name:"HaloPesa",code:"HP",provider:"HALOPESA",hint:"Halotel"}];
const normalizeTzPhone=(raw:string)=>{
 const digits=raw.replace(/\D/g,"");
 if(digits.startsWith("255"))return `+${digits}`;
 if(digits.startsWith("0"))return `+255${digits.slice(1)}`;
 return `+255${digits}`;
};
const money=(n:number)=>"TZS "+new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);
function shortDate(value:string){try{return new Intl.DateTimeFormat("en-TZ",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value))}catch{return value}}
const promoBanners=[
  {name:"Trophy Hunt",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/4124b46f143179262137c2416481cd8f1920x248drn.webp"},
  {name:"First Deposit Bonus",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/089c920dc75c5521df21ef9d815a0c4f1920x248dn.webp"},
  {name:"Welcome Package",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/84f432d7c26b2194d2bdcd5f7f54ad271920x248dn.webp"},
  {name:"Tennis Challenge",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/901d211ac0cc7c92c0525292c1a431831920x248dn.webp"},
  {name:"Riot Race",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/f5ae71f3eae09c02aaf5cb1d81e255981920x248drn.webp"},
  {name:"Banner 1",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/00d9bdb9709f868424601e994d289233.webp"},
  {name:"Banner 2",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/0847a49250495282ed700e66aee91084r.webp"},
  {name:"Banner 3",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/0c165c5f812c8ae0f12b6c9908627e0e.webp"},
  {name:"Banner 4",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/0ce7b5ad5833b66232f3d5a9d8280461.webp"},
  {name:"Banner 5",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/134064af715a56f1d0182d3da9f54aecr.webp"},
  {name:"Banner 6",image:"https://v3.traincdn.com/genfiles/banners-admin-api/all/1ec297dbaec39946c9f51e6995df9d6a1920x248drn.webp"}
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Dar_es_Salaam" }).format(new Date(value));
}
function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("en-TZ", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Dar_es_Salaam" }).format(new Date(value));
}

function toEvent(event: ApiEvent): Event {
  const matchWinner = event.markets.find(m => m.key === "match-winner") ?? event.markets[0];
  const outcomeOrder: Record<string, number> = { home: 0, draw: 1, away: 2 };
  const orderedOutcomes = [...(matchWinner?.outcomes ?? [])].sort((a, b) => (outcomeOrder[a.key] ?? 99) - (outcomeOrder[b.key] ?? 99));
  const markets = orderedOutcomes.slice(0, 3).map(outcome => ({
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
    homeLogo: event.homeTeam?.logoUrl ?? undefined,
    awayLogo: event.awayTeam?.logoUrl ?? undefined,
    leagueLogo: event.competition?.logoUrl ?? undefined,
    bannerLogo: event.competition?.logoUrl ?? event.homeTeam?.logoUrl ?? event.awayTeam?.logoUrl ?? undefined,
  };
}

function TeamLogo({src,label}:{src?:string;label:string}){return src?<img className="team-logo" src={src} alt={`${label} logo`} loading="lazy"/>:<i className="team-logo fallback">{label.slice(0,3).toUpperCase()}</i>}

export default function SportsHub({initialTab="prematch"}:{initialTab?:"prematch"|"live"}={}){
  const [tab,setTab]=useState<"prematch"|"live">(initialTab);
  const [sport,setSport]=useState("Football");
  const [expandedSport,setExpandedSport]=useState<string|null>("Football");
  const [query,setQuery]=useState("" );
  const [timeFilter,setTimeFilter]=useState<"all"|"today"|"tomorrow"|"soon">("all");
  const [countryFilter,setCountryFilter]=useState<string|null>(null);
  const [expandedCountry,setExpandedCountry]=useState<string|null>(null);
  const [topCompetitionsOpen,setTopCompetitionsOpen]=useState(true);
  const [topGamesOpen,setTopGamesOpen]=useState(true);
  const [topGameIndex,setTopGameIndex]=useState(0);
  const [leagueFilter,setLeagueFilter]=useState<{league:string;country:string}|null>(null);
  const [events,setEvents]=useState<Event[]>([]);
  const [eventsNotice,setEventsNotice]=useState("");
  const [eventsLoading,setEventsLoading]=useState(true);
  const [eventsReload,setEventsReload]=useState(0);
  const [slip,setSlip]=useState<Selection[]>(()=>loadSlip());
  useEffect(()=>{saveSlip(slip)},[slip]);
  const [stake,setStake]=useState(5000);
  const [mobileSlip,setMobileSlip]=useState(false);
  const [oddsAccepted,setOddsAccepted]=useState(true);
  const [bookingInput,setBookingInput]=useState("");
  const [bookingCode,setBookingCode]=useState("");
  const [bookingCopied,setBookingCopied]=useState(false);
  const [bookingQuote,setBookingQuote]=useState<BookingQuote|null>(null);
  const [bookingStake,setBookingStake]=useState("");
  const [bookingModalError,setBookingModalError]=useState("");
  const [betPrompt,setBetPrompt]=useState<BetPrompt|null>(null);
  const [depositOpen,setDepositOpen]=useState(false);
  const [depositAmount,setDepositAmount]=useState("10000");
  const [depositMethod,setDepositMethod]=useState(depositMethods[0].name);
  const [depositPhone,setDepositPhone]=useState("");
  const [depositBusy,setDepositBusy]=useState(false);
  const [depositNotice,setDepositNotice]=useState("");
  const [depositError,setDepositError]=useState("");
  const [depositResume,setDepositResume]=useState<{stakeTzs:number;bookingCode?:string}|null>(null);
  const [loginOpen,setLoginOpen]=useState(false);
  const [authMode,setAuthMode]=useState<"login"|"register">("login");
  const [bannerIndex,setBannerIndex]=useState(0);
  const [slipNotice,setSlipNotice]=useState("");
  const [slipBusy,setSlipBusy]=useState(false);
  const [validation,setValidation]=useState<ValidationPreview|null>(null);
  const [user,setUser]=useState<SessionUser|null>(null);
  const [wallet,setWallet]=useState<Wallet|null>(null);
  const [sessionLoading,setSessionLoading]=useState(true);
  const [slipTab,setSlipTab]=useState<"betslip"|"my-bets">("betslip");
  const [sidebarBets,setSidebarBets]=useState<AccountBet[]|null>(null);
  const [sidebarBetsNotice,setSidebarBetsNotice]=useState("Log in to see your tickets here.");
  const [expandedSidebarBet,setExpandedSidebarBet]=useState<string|null>(null);
  const [cashOutBusy,setCashOutBusy]=useState<string|null>(null);
  const [cashOutOffers,setCashOutOffers]=useState<Record<string,number|null>>({});
  const [betsReload,setBetsReload]=useState(0);
  const [bonusPopup,setBonusPopup]=useState<number|null>(null);

  useEffect(()=>{
    const stored=localStorage.getItem("mkwanjabet_signup_bonus");
    if(stored){localStorage.removeItem("mkwanjabet_signup_bonus");setBonusPopup(Number(stored)||20000)}
  },[]);

  useEffect(()=>{
    let mounted=true;
    setEventsLoading(true);setEventsNotice("");
    apiRequest<ApiEvent[]>("/events").then(data=>{
      if(!mounted)return;
      const next=data.map(toEvent);
      if(next.length){setEvents(next);setSport(current=>next.some(event=>event.sport===current)?current:next[0].sport);setExpandedSport(current=>current&&next.some(event=>event.sport===current)?current:next[0].sport);setEventsNotice("");}
      else setEventsNotice("No live sportsbook events are available right now.");
    }).catch(()=>{
      if(mounted){setEvents([]);setEventsNotice("Sportsbook events are temporarily unavailable.");}
    }).finally(()=>{if(mounted)setEventsLoading(false)});
    return()=>{mounted=false};
  },[eventsReload]);
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
    if(slipTab!=="my-bets"||sessionLoading)return;
    if(!user){setSidebarBets([]);setSidebarBetsNotice("Log in to see your tickets here.");return;}
    let mounted=true;
    setSidebarBets(null);setSidebarBetsNotice("Loading your tickets...");
    authenticatedApiRequest<AccountBet[]>("/betting/my-bets").then(data=>{
      if(!mounted)return;
      const mapped=data.map(b=>({...b,date:shortDate(b.date),settledAt:b.settledAt?shortDate(b.settledAt):undefined}));
      setSidebarBets(mapped);setExpandedSidebarBet(current=>current&&mapped.some(b=>b.id===current)?current:mapped[0]?.id??null);setSidebarBetsNotice(mapped.length?`${mapped.length} ticket${mapped.length===1?"":"s"} ready for quick access.`:"No tickets yet. Place a bet and it will show here.");
    }).catch(()=>{if(mounted){setSidebarBets([]);setSidebarBetsNotice("Could not load your bets right now.")}});
    return()=>{mounted=false};
  },[slipTab,sessionLoading,user,betsReload]);
  useEffect(()=>{
    if(sessionLoading||!user)return;
    const params=new URLSearchParams(window.location.search);const code=params.get("booking");
    if(!code)return;
    window.history.replaceState({},"","/sports");
    void loadBookingCode(code);
  },[sessionLoading,user]);
  const sportOptions=useMemo(()=>Array.from(new Set(events.map(event=>event.sport))).map(name=>({name,icon:sportIcons[name]??"•",count:events.filter(event=>event.sport===name).length})),[events]);
  const countriesBySport=useMemo(()=>Object.fromEntries(sportOptions.map(option=>{
    const counts=new Map<string,number>();
    for(const event of events){
      if(event.sport!==option.name||countryPriority(event.country)===999)continue;
      counts.set(event.country,(counts.get(event.country)??0)+1);
    }
    const list=Array.from(counts,([country,count])=>{
      const configured=POPULAR_COUNTRIES.find(item=>item.value.toLowerCase()===country.toLowerCase());
      return {country,label:configured?.label??country,count};
    }).sort((a,b)=>countryPriority(a.country)-countryPriority(b.country));
    return [option.name,list];
  })),[events,sportOptions]);
  const competitionsBySport=useMemo(()=>Object.fromEntries(sportOptions.map(option=>{
    const seen=new Map<string,{league:string;country:string;count:number;leagueLogo?:string}>();
    for(const event of events){
      if(event.sport!==option.name||countryPriority(event.country)===999)continue;
      const key=`${event.country}|${event.league}`;
      const current=seen.get(key);
      if(current)current.count++;
      else seen.set(key,{league:event.league,country:event.country,count:1,leagueLogo:event.leagueLogo});
    }
    const list=Array.from(seen.values()).sort((a,b)=>countryPriority(a.country)-countryPriority(b.country)||leaguePriority(a.league)-leaguePriority(b.league)||a.league.localeCompare(b.league));
    return [option.name,list];
  })),[events,sportOptions]);
  const topCompetitions=(competitionsBySport.Football??[]).filter(item=>leaguePriority(item.league)<999).sort((a,b)=>leaguePriority(a.league)-leaguePriority(b.league)).slice(0,6);
  const topGames=events.filter(event=>event.sport==="Football"&&event.markets.length).sort((a,b)=>Number(b.live)-Number(a.live)||new Date(a.time).getTime()-new Date(b.time).getTime()).slice(0,5);
  const topGame=topGames[topGameIndex%Math.max(1,topGames.length)];
  const visible=events.filter(e=>{
    const tabMatch=tab==="live" ? e.live : !e.live;
    const sportMatch=e.sport===sport;
    const q=`${e.home} ${e.away} ${e.league} ${e.country}`.toLowerCase();
    const now=new Date();const eventDate=new Date(e.time);const startOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());const startOfTomorrow=new Date(startOfToday);startOfTomorrow.setDate(startOfTomorrow.getDate()+1);const endOfTomorrow=new Date(startOfTomorrow);endOfTomorrow.setDate(endOfTomorrow.getDate()+1);
    const timeMatch=timeFilter==="all"||e.live||(timeFilter==="today"&&eventDate>=startOfToday&&eventDate<startOfTomorrow)||(timeFilter==="tomorrow"&&eventDate>=startOfTomorrow&&eventDate<endOfTomorrow)||(timeFilter==="soon"&&eventDate>=now&&eventDate.getTime()-now.getTime()<=3*60*60*1000);
    const countryMatch=!countryFilter||e.country===countryFilter;
    const leagueMatch=!leagueFilter||(e.league===leagueFilter.league&&e.country===leagueFilter.country);
    return tabMatch && sportMatch && countryMatch && timeMatch && leagueMatch && q.includes(query.toLowerCase());
  });
  const groupedVisible=useMemo(()=>{
    const groups:{key:string;country:string;league:string;leagueLogo?:string;events:Event[]}[]=[];
    const index=new Map<string,number>();
    for(const e of visible){
      const key=`${e.country}|${e.league}`;
      let i=index.get(key);
      if(i===undefined){i=groups.length;index.set(key,i);groups.push({key,country:e.country,league:e.league,leagueLogo:e.leagueLogo,events:[]});}
      groups[i].events.push(e);
    }
    return groups;
  },[visible]);
  const featuredEvent=visible[0]??events[0];
  const activePromo=promoBanners[bannerIndex%promoBanners.length];
  const visibleWithOdds=visible.filter(event=>event.markets.length>0).length;
  const visibleLive=visible.filter(event=>event.live).length;
  const totalOdds=useMemo(()=>slip.reduce((n,s)=>n*s.odds,1),[slip]);
  const potential=stake*totalOdds;
  const latestSidebarBets=(sidebarBets??[]).slice(0,8);


  useEffect(()=>{
    const timer=window.setInterval(()=>setBannerIndex(index=>(index+1)%promoBanners.length),4500);
    return()=>window.clearInterval(timer);
  },[]);

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
  const refreshWallet=async()=>{const balance=await authenticatedApiRequest<Wallet>("/wallet/me");setWallet(balance);return balance};
  const openLoginModal=(mode:"login"|"register"="login")=>{setAuthMode(mode);setLoginOpen(true)};
  const onAuthSuccess=async(authedUser:SessionUser)=>{
    setUser(authedUser);
    try{setWallet(await authenticatedApiRequest<Wallet>("/wallet/me"))}catch{setWallet(null)}
    setLoginOpen(false);
  };
  const openDepositModal=(amountTzs=10000,resume?:{stakeTzs:number;bookingCode?:string})=>{
    if(!user){openLoginModal();return;}
    setDepositAmount(String(Math.max(1000,amountTzs)));setDepositPhone(user?.phone.replace(/^\+255/,"")??"");setDepositResume(resume??null);setDepositNotice("");setDepositError("");setDepositOpen(true);setBetPrompt(null);
  };
  const depositForBet=(required:number,code?:string)=>{
    const available=wallet?.availableBalanceTzs??0;
    const deposit=Math.max(1000,required-available);
    localStorage.setItem("mkwanjabet_pending_bet",JSON.stringify({bookingCode:code||null,stakeTzs:required,selections:code?null:slip}));
    if(code)setBookingQuote(null);
    openDepositModal(deposit,{stakeTzs:required,bookingCode:code});
  };
  const pollSportsDeposit=async(reference:string)=>{
    for(let attempt=0;attempt<6;attempt++){
      await new Promise(resolve=>setTimeout(resolve,5000));
      try{
        const entry=await authenticatedApiRequest<ApiTransaction>("/wallet/deposit/"+encodeURIComponent(reference)+"/status",{method:"POST"});
        const balance=await refreshWallet();
        if(entry.status==="COMPLETED"){
          setDepositNotice("Deposit confirmed. Your wallet balance is updated.");
          setDepositOpen(false);
          if(depositResume?.bookingCode)void loadBookingCode(depositResume.bookingCode);
          else if(depositResume)setBetPrompt({kind:"confirm",title:"Confirm stake",message:"TZS "+depositResume.stakeTzs.toLocaleString()+" will be deducted from your wallet when this ticket is accepted.",primary:"Place bet",secondary:"Review slip",stakeTzs:depositResume.stakeTzs});
          return;
        }
        if(entry.status==="FAILED"){setDepositError("The deposit was not completed. Please try again.");return;}
      }catch{return}
    }
    setDepositNotice("Payment request sent. We will keep checking your wallet balance.");
  };
  const submitDeposit=async()=>{
    if(!user)return;
    const amountTzs=Number(depositAmount);
    setDepositNotice("");setDepositError("");
    if(!Number.isInteger(amountTzs)||amountTzs<1000||amountTzs>10000000){setDepositError("Enter an amount between 1,000 and 10,000,000 TZS.");return;}
    setDepositBusy(true);
    try{
      const method=depositMethods.find(item=>item.name===depositMethod)??depositMethods[0];
      const phone=normalizeTzPhone(depositPhone);
      const entry=await authenticatedApiRequest<ApiTransaction>("/wallet/deposit",{method:"POST",body:JSON.stringify({provider:method.provider,phone,amountTzs})});
      await refreshWallet();setDepositNotice("Push USSD sent. Approve the payment on your phone.");void pollSportsDeposit(entry.reference);
    }catch(error){setDepositError(apiMessage(error))}
    finally{setDepositBusy(false)}
  };
  const submitBet=async()=>{
    setSlipBusy(true);setSlipNotice("");setBetPrompt(null);
    try{const bet=await authenticatedApiRequest<PlacedBet>("/betting/place",{method:"POST",body:JSON.stringify({selections:apiSelections(),stakeTzs:stake,acceptOddsChanges:oddsAccepted})});const balance=await authenticatedApiRequest<Wallet>("/wallet/me");setWallet(balance);setSlip([]);setValidation(null);setBookingCode("");setBookingInput("");localStorage.removeItem("mkwanjabet_pending_bet");setSlipNotice("Bet placed. Ticket "+bet.ticketCode);setSlipTab("my-bets");setBetsReload(value=>value+1)}
    catch(error){const msg=apiMessage(error);setValidation(null);setSlipNotice(msg);if(msg.toLowerCase().includes("insufficient"))setBetPrompt({kind:"deposit",title:"Deposit needed",message:"Your balance is not enough for this stake. Add funds now and come back to this ticket.",primary:"Deposit funds",secondary:"Keep editing",stakeTzs:stake})}finally{setSlipBusy(false)}
  };
  const placeBet=async()=>{
    if(!user){openLoginModal();return;}
    if(!slip.length)return;
    if((wallet?.availableBalanceTzs??0)<stake){setBetPrompt({kind:"deposit",title:"Deposit needed",message:"Your balance is not enough for this stake. Add funds now and come back to this ticket.",primary:"Deposit funds",secondary:"Keep editing",stakeTzs:stake});return;}
    setBetPrompt({kind:"confirm",title:"Confirm stake",message:"TZS "+stake.toLocaleString()+" will be deducted from your wallet when this ticket is accepted.",primary:"Place bet",secondary:"Review slip",stakeTzs:stake});
  };
  const loadBookingCode=async(rawCode:string)=>{
    const code=rawCode.trim().toUpperCase();if(!code)return;
    if(!user){openLoginModal();return;}
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
      const balance=await authenticatedApiRequest<Wallet>("/wallet/me");setWallet(balance);setBookingQuote(null);setBookingCode("");setBookingInput("");localStorage.removeItem("mkwanjabet_pending_bet");setSlipNotice("Booking placed. Ticket "+bet.ticketCode);setSlipTab("my-bets");setBetsReload(value=>value+1);
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


  const loadCashOutOffer=async(bet:AccountBet)=>{
    try{const data=await authenticatedApiRequest<{eligible:boolean;offerTzs:number|null}>("/betting/my-bets/"+encodeURIComponent(bet.betId)+"/cash-out");setCashOutOffers(prev=>({...prev,[bet.betId]:data.eligible?data.offerTzs:null}))}
    catch{setCashOutOffers(prev=>({...prev,[bet.betId]:null}))}
  };
  const toggleSidebarBet=(b:AccountBet)=>{
    const next=expandedSidebarBet===b.id?null:b.id;
    setExpandedSidebarBet(next);
    if(next&&b.status==="Open")void loadCashOutOffer(b);
  };
  const requestCashOut=async(bet:AccountBet)=>{
    setCashOutBusy(bet.id);setSidebarBetsNotice("");
    try{const result=await authenticatedApiRequest<{ticketCode:string;status:string;payoutTzs:number}>("/betting/my-bets/"+encodeURIComponent(bet.betId)+"/cash-out",{method:"POST"});setSidebarBetsNotice(`Cashed out for ${money(result.payoutTzs)}.`);setCashOutOffers(prev=>({...prev,[bet.betId]:null}));setBetsReload(value=>value+1)}
    catch(error){setSidebarBetsNotice(apiMessage(error))}
    finally{setCashOutBusy(null)}
  };
  const toggle=(e:Event,m:Market)=>{
    const id=`${e.id}-${m.outcomeId}`;
    const next={id,eventId:e.id,sport:e.sport,league:e.league,match:`${e.home} vs ${e.away}`,marketId:m.id,market:"Match result",outcomeId:m.outcomeId,pick:m.name,odds:m.odds};
    setSlip(x=>x.some(s=>s.id===id)?x.filter(s=>s.id!==id):[...x.filter(s=>s.eventId!==e.id&&s.marketId!==m.id),next]);
  };

  const BetSlip = ({mobile=false}:{mobile?:boolean}) => (<aside className={`betslip ${mobile?"mobile-slip-panel":""}`}>
    {mobile && <button className="slip-close" onClick={()=>setMobileSlip(false)}>×</button>}
    <div className="betslip-tabs"><button className={slipTab==="betslip"?"active":""} onClick={()=>setSlipTab("betslip")}>Betslip <b>{slip.length}</b></button><button className={slipTab==="my-bets"?"active":""} onClick={()=>setSlipTab("my-bets")}>My Bets</button></div>
    {slipTab==="my-bets"?<div className="sidebar-my-bets"><div className="sidebar-my-bets-head"><div><b>My Bets</b><span>{sidebarBetsNotice}</span></div>{user&&<button onClick={()=>setBetsReload(value=>value+1)}>Refresh</button>}</div>{!user?<div className="sidebar-bets-empty"><b>Log in required</b><span>Sign in to view tickets without leaving the sportsbook.</span><button onClick={()=>openLoginModal()}>Log in</button></div>:sidebarBets===null?<div className="sidebar-bets-empty"><b>Loading tickets</b><span>Fetching your latest wallet-backed bets...</span></div>:!latestSidebarBets.length?<div className="sidebar-bets-empty"><b>No bets yet</b><span>Pick odds from the board and your tickets will appear here.</span></div>:<div className="sidebar-bets-list">{latestSidebarBets.map(b=><article key={b.id} className={`sidebar-bet status-${b.status.toLowerCase().replace(" ","-")}`}><button className="sidebar-bet-main" onClick={()=>toggleSidebarBet(b)}><span><small>{b.type.toUpperCase()} · {b.date}</small><b>{b.id}</b><i>{b.bookingCode?`Booking ${b.bookingCode}`:"Direct ticket"}</i></span><strong>{b.status}</strong></button><div className="sidebar-bet-stats"><span><small>Stake</small><b>{money(b.stake)}</b></span><span><small>Odds</small><b>{b.odds.toFixed(2)}</b></span><span><small>{b.status==="Won"?"Win":b.status==="Void"?"Refund":"Return"}</small><b>{money(b.returnAmount)}</b></span></div>{expandedSidebarBet===b.id&&<div className="sidebar-bet-detail"><div className="sidebar-bet-actions"><button onClick={()=>setExpandedSidebarBet(null)}>Hide details</button>{b.status!=="Open"?<button disabled>Settled</button>:cashOutOffers[b.betId]===undefined?<button disabled>Checking cash out...</button>:cashOutOffers[b.betId]===null?<button disabled>Cash out unavailable</button>:<button className="cashout" disabled={cashOutBusy===b.id} onClick={()=>requestCashOut(b)}>{cashOutBusy===b.id?"Cashing out...":"Cash out "+money(cashOutOffers[b.betId]!)}</button>}</div>{b.selections.map((s,index)=><div className="sidebar-selection" key={`${b.id}-${s.eventId}-${s.marketId}-${s.outcomeId}`}><span className={s.state.toLowerCase()}>{s.state==="WON"?"✓":s.state==="LOST"?"✗":s.state==="VOID"?"–":index+1}</span><div><b>{s.pick}</b><small>{s.match}</small><small>{s.market}</small></div><strong>{s.odd.toFixed(2)}</strong><i>{s.state}</i></div>)}</div>}</article>)}</div>}</div>:!slip.length?<div className="empty-slip"><span>＋</span><h3>Your betslip is empty</h3><p>Select odds from any event to build your ticket.</p><div><b>Booking code</b><div className="booking-row"><input value={bookingInput} onChange={e=>setBookingInput(e.target.value.toUpperCase())} placeholder="Enter booking code"/><button disabled={slipBusy} onClick={loadBooking}>Load</button></div>{slipNotice&&<small className="slip-notice">{slipNotice}</small>}</div></div>:<>
      <div className="slip-topline"><span>Accumulator</span><button onClick={()=>setSlip([])}>Clear all</button></div>{slipNotice&&<div className="slip-notice">{slipNotice}</div>}
      <div className="slip-items">{slip.map(s=><article key={s.id}><button aria-label="Remove selection" onClick={()=>setSlip(x=>x.filter(v=>v.id!==s.id))}>×</button><small>{s.market}</small><strong>{s.pick} · {s.match}</strong><div><span>Odds</span><b>{s.odds.toFixed(2)}</b></div></article>)}</div>
      <div className="slip-summary">
        <label>Stake (TZS)<input type="text" inputMode="numeric" value={stake||""} onChange={e=>setStake(Number(sanitizeAmountInput(e.target.value))||0)} placeholder="0"/></label>
        <div className="quick-stakes">{[1000,2000,5000,10000].map(v=><button key={v} onClick={()=>setStake(v)}>+{v/1000}K</button>)}</div>
        <p><span>Total odds</span><b>{totalOdds.toFixed(2)}</b></p><p><span>Potential payout</span><b>TZS {potential.toLocaleString("en-US",{maximumFractionDigits:0})}</b></p>
        <label className="odds-change"><input type="checkbox" checked={oddsAccepted} onChange={e=>setOddsAccepted(e.target.checked)}/> Accept odds changes</label>
        <button className="booking-save-btn" disabled={slipBusy||!slip.length} onClick={validateTicket}>{slipBusy?"Working...":"Validate ticket"}</button>
        {validation&&<div className={`ticket-validation ${validation.status.toLowerCase()}`}><b>{validation.status}</b><span>{validation.message}</span>{[...validation.errors,...validation.warnings].slice(0,3).map(x=><small key={x}>{x}</small>)}</div>}
        <button className="booking-save-btn" disabled={slipBusy||!slip.length} onClick={saveBooking}>{slipBusy?"Working...":"Save booking code"}</button>{bookingCode&&<div className="saved-code"><span>Booking code</span><b>{bookingCode}</b><button onClick={copyBookingCode}>{bookingCopied?"Copied":"Copy"}</button></div>}<button className="place-bet-btn" disabled={slipBusy||!slip.length} onClick={placeBet}>{slipBusy?"Working...":user?"Place bet":"Log in to place bet"}</button>
        <small>18+ · Play responsibly. Stakes are deducted from your wallet when a ticket is accepted.</small>
      </div>
    </>}
  </aside>);

  return <main className="sports-shell">
    <AuthModal open={loginOpen} mode={authMode} onModeChange={setAuthMode} onClose={()=>setLoginOpen(false)} onSuccess={onAuthSuccess}/>
    {bonusPopup!==null&&<div className="bonus-popup-backdrop" role="presentation" onMouseDown={()=>setBonusPopup(null)}><section className="bonus-popup" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><span className="bonus-popup-icon">🎉</span><h2>Hongera!</h2><p>Umepokea kiasi cha</p><strong>TZS {bonusPopup.toLocaleString("en-US")}</strong><small>Bonasi hii unaweza kuitumia kubet, lakini haiwezi kutolewa moja kwa moja.</small><button onClick={()=>setBonusPopup(null)}>Anza kubet</button></section></div>}
    {depositOpen&&<div className="booking-modal-backdrop sports-deposit-backdrop" role="presentation" onMouseDown={()=>!depositBusy&&setDepositOpen(false)}><section className="booking-modal sports-deposit-modal" role="dialog" aria-modal="true" aria-labelledby="sports-deposit-title" onMouseDown={e=>e.stopPropagation()}><header><div><span>INSTANT WALLET TOP UP</span><h2 id="sports-deposit-title">Deposit funds</h2></div><button aria-label="Close" onClick={()=>setDepositOpen(false)} disabled={depositBusy}>×</button></header><div className="sports-deposit-card"><div className="sports-deposit-balance"><span>Available balance</span><b>TZS {(wallet?.availableBalanceTzs??0).toLocaleString("en-US")}</b></div><div className="sports-deposit-methods">{depositMethods.map(method=><button key={method.name} className={depositMethod===method.name?"active":""} onClick={()=>setDepositMethod(method.name)} disabled={depositBusy}><b>{method.code}</b><span>{method.name}<small>{method.hint}</small></span></button>)}</div><label className="sports-deposit-phone"><span>Mobile number</span><div><b>+255</b><input inputMode="tel" value={depositPhone} onChange={e=>setDepositPhone(e.target.value.replace(/[^0-9+]/g,""))} placeholder="7XX XXX XXX"/></div></label><label className="sports-deposit-amount"><span>Amount</span><div><b>TZS</b><input inputMode="numeric" value={depositAmount} onChange={e=>setDepositAmount(sanitizeAmountInput(e.target.value))}/></div></label><div className="sports-deposit-chips">{[5000,10000,20000,50000].map(amount=><button key={amount} onClick={()=>setDepositAmount(String(amount))} disabled={depositBusy}>{amount.toLocaleString()}</button>)}</div>{depositResume&&<div className="sports-deposit-resume"><b>Funding pending ticket</b><span>Stake TZS {depositResume.stakeTzs.toLocaleString()}{depositResume.bookingCode?` · Booking ${depositResume.bookingCode}`:""}</span></div>}{depositError&&<div className="booking-modal-error">{depositError}</div>}{depositNotice&&<div className="sports-deposit-notice">{depositNotice}</div>}</div><footer><button className="secondary" onClick={()=>setDepositOpen(false)} disabled={depositBusy}>Stay on sports</button><button className="deposit" onClick={submitDeposit} disabled={depositBusy}>{depositBusy?"Sending push...":"Deposit TZS "+(Number(depositAmount)||0).toLocaleString()}</button></footer><p>Approve the mobile-money push on your phone. Your balance updates here when the payment confirms.</p></section></div>}
    {betPrompt&&<div className="booking-modal-backdrop bet-prompt-backdrop" role="presentation" onMouseDown={()=>!slipBusy&&setBetPrompt(null)}><section className="booking-modal bet-prompt" role="dialog" aria-modal="true" aria-labelledby="bet-prompt-title" onMouseDown={e=>e.stopPropagation()}><header><div><span>{betPrompt.kind==="deposit"?"WALLET CHECK":"BETSLIP CONFIRMATION"}</span><h2 id="bet-prompt-title">{betPrompt.title}</h2></div><button aria-label="Close" onClick={()=>setBetPrompt(null)} disabled={slipBusy}>×</button></header><div className="bet-prompt-body"><p>{betPrompt.message}</p><div><span>Stake</span><b>TZS {betPrompt.stakeTzs.toLocaleString()}</b></div><div><span>Wallet balance</span><b>TZS {(wallet?.availableBalanceTzs??0).toLocaleString("en-US")}</b></div>{betPrompt.kind==="deposit"&&<small>We will keep the ticket in your browser so you can return after funding.</small>}</div><footer><button className="secondary" onClick={()=>setBetPrompt(null)} disabled={slipBusy}>{betPrompt.secondary}</button><button className={betPrompt.kind==="deposit"?"deposit":"confirm"} disabled={slipBusy} onClick={()=>betPrompt.kind==="deposit"?depositForBet(betPrompt.stakeTzs):submitBet()}>{slipBusy?"Working...":betPrompt.primary}</button></footer></section></div>}
    {bookingQuote&&<div className="booking-modal-backdrop" role="presentation" onMouseDown={()=>!slipBusy&&setBookingQuote(null)}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" onMouseDown={e=>e.stopPropagation()}><header><div><span>SECURE BOOKING</span><h2 id="booking-modal-title">Confirm your ticket</h2></div><button aria-label="Close" onClick={()=>setBookingQuote(null)} disabled={slipBusy}>×</button></header><div className="booking-modal-code"><span>Booking code</span><strong>{bookingQuote.code}</strong><small>Picks remain hidden until this wallet-backed ticket is accepted.</small></div><div className="booking-modal-stats"><div><span>Selections</span><b>{bookingQuote.selectionCount}</b></div><div><span>Total odds</span><b>{bookingQuote.totalOdds.toFixed(2)}</b></div><div><span>Potential return</span><b>TZS {Math.floor((Number(bookingStake)||0)*bookingQuote.totalOdds).toLocaleString()}</b></div></div><label className="booking-modal-stake"><span>Your stake · Minimum TZS {bookingQuote.minimumBookingStakeTzs.toLocaleString()}</span><div><b>TZS</b><input autoFocus type="text" inputMode="numeric" placeholder="0" value={bookingStake} onChange={e=>{setBookingStake(sanitizeAmountInput(e.target.value));setBookingModalError("")}}/></div></label><div className="booking-modal-balance"><span>Available balance</span><b>TZS {bookingQuote.availableBalanceTzs.toLocaleString()}</b></div>{bookingQuote.availableBalanceTzs<(Number(bookingStake)||0)&&<div className="booking-modal-warning"><b>Deposit required</b><span>You need TZS {Math.max(0,(Number(bookingStake)||0)-bookingQuote.availableBalanceTzs).toLocaleString()} more. Deposited funds stay in your wallet until you return and confirm.</span></div>}{bookingModalError&&<div className="booking-modal-error">{bookingModalError}</div>}<footer><button className="secondary" onClick={()=>setBookingQuote(null)} disabled={slipBusy}>Cancel</button><button className={bookingQuote.availableBalanceTzs<(Number(bookingStake)||0)?"deposit":"confirm"} onClick={confirmBooking} disabled={slipBusy}>{slipBusy?"Processing...":bookingQuote.availableBalanceTzs<(Number(bookingStake)||0)?"Deposit funds":"Confirm & place bet"}</button></footer><p>Current odds, account limits, and wallet balance are revalidated before acceptance.</p></section></div>}

    <header className="sports-topbar">
      <Link className="sports-brand" href="/"><img src="/brand/icon/mb-mark-color.png" alt="MkwanjaBet"/><span className="sr-only">MkwanjaBet</span></Link>
      <nav className="sports-toplinks"><Link href="/responsible-play">Responsible play</Link></nav>
      <div className="sports-actions">{user?<Link className="wallet-preview" href="/dashboard"><small>Balance</small><b>TZS {(wallet?.availableBalanceTzs??0).toLocaleString("en-US")}</b></Link>:<button className="wallet-preview" onClick={()=>openLoginModal()}><small>Balance</small><b>TZS 0</b></button>}{sessionLoading?<span className="sports-session-loading">Checking session...</span>:user?<Link className="sports-register" href="/dashboard">My account</Link>:<><button onClick={()=>openLoginModal("login")}>Log in</button><button className="sports-register" onClick={()=>openLoginModal("register")}>Register</button></>}</div>
    </header>
    <div className="sports-mainnav">
      <Link className={tab==="prematch"?"active":""} href="/sports">Sports</Link><Link className={tab==="live"?"active":""} href="/live">Live</Link><Link href="/my-bets">My bets</Link><Link href="/results">Results</Link><Link href="/wallet/deposit">Deposit</Link>
    </div>
    <section className="ticker"><b>IN PLAY</b>{Array.from(new Set(events.map(event=>event.league))).slice(0,6).map(league=><span key={league}>{league}</span>)}{!events.length&&<span>Waiting for event feed</span>}</section>
    <section className="sports-layout">
      <aside className="sports-left">
        <h3>Sports</h3>
        <section className="sports-sidebar-feature">
          <button className="sidebar-section-title" onClick={()=>setTopCompetitionsOpen(value=>!value)}><span>🏆</span><b>Top competitions</b><i>{topCompetitionsOpen?"−":"+"}</i></button>
          {topCompetitionsOpen&&<div className="top-competition-list">{topCompetitions.length?topCompetitions.map(item=><button key={`top-${item.country}-${item.league}`} className={leagueFilter?.league===item.league&&leagueFilter?.country===item.country?"active":""} onClick={()=>{setSport("Football");setCountryFilter(item.country);setExpandedCountry(item.country);setLeagueFilter({league:item.league,country:item.country})}}>{item.leagueLogo?<img src={item.leagueLogo} alt="" loading="lazy"/>:<span>⚽</span>}<b>{item.league}</b><small>{item.count}</small></button>):<small className="sports-empty-competitions">Waiting for top competitions</small>}</div>}
        </section>
        <section className="sports-sidebar-feature">
          <button className="sidebar-section-title" onClick={()=>setTopGamesOpen(value=>!value)}><span>◉</span><b>Top Games</b><i>{topGames.length?`${topGameIndex+1}/${topGames.length}`:topGamesOpen?"−":"+"}</i></button>
          {topGamesOpen&&topGame&&<article className="top-game-card"><header>{topGame.leagueLogo?<img src={topGame.leagueLogo} alt="" loading="lazy"/>:<span>⚽</span>}<b>{topGame.league}</b>{topGame.live&&<em>LIVE</em>}</header><Link href={`/sports/match/${topGame.id}`}><div><TeamLogo src={topGame.homeLogo} label={topGame.home}/><span>{topGame.home}</span><strong>{topGame.live?topGame.score?.split(" - ")[0]??"-":""}</strong></div><div><TeamLogo src={topGame.awayLogo} label={topGame.away}/><span>{topGame.away}</span><strong>{topGame.live?topGame.score?.split(" - ")[1]??"-":""}</strong></div><small>{topGame.live?`Live ${topGame.minute??""}`:shortDate(topGame.time)}</small></Link><div className="top-game-odds">{topGame.markets.map(m=><button key={m.outcomeId} onClick={()=>toggle(topGame,m)}><span>{m.label}</span><b>{m.odds.toFixed(2)}</b></button>)}</div><footer><button disabled={topGameIndex===0} onClick={()=>setTopGameIndex(index=>Math.max(0,index-1))}>‹</button><span>Real feed</span><button disabled={topGameIndex>=topGames.length-1} onClick={()=>setTopGameIndex(index=>Math.min(topGames.length-1,index+1))}>›</button></footer></article>}
        </section>
        {sportOptions.map(({name,icon,count})=><div className="sports-left-group" key={name}><button onClick={()=>{setSport(name);setExpandedSport(current=>current===name?null:name);setCountryFilter(null);setExpandedCountry(null);setLeagueFilter(null)}} className={sport===name?"active":""}><span>{icon}</span>{name}<small>{count}</small></button>{expandedSport===name&&<div className="sports-country-list">{(countriesBySport[name]??[]).length?(countriesBySport[name]??[]).map(item=><div className="sports-country-group" key={item.country}><button className={countryFilter===item.country?"active":""} onClick={()=>{const open=expandedCountry===item.country?null:item.country;setSport(name);setExpandedCountry(open);setCountryFilter(open);setLeagueFilter(null)}}><span>{item.country==="World"?"EU":item.country.slice(0,2).toUpperCase()}</span><b>{item.label}</b><small>{item.count}</small><i>{expandedCountry===item.country?"⌃":"⌄"}</i></button>{expandedCountry===item.country&&<div className="country-league-list">{(competitionsBySport[name]??[]).filter(c=>c.country===item.country).map(c=><button key={`${c.country}-${c.league}`} className={leagueFilter?.league===c.league&&leagueFilter?.country===c.country?"active":""} onClick={()=>setLeagueFilter(current=>current?.league===c.league&&current?.country===c.country?null:{league:c.league,country:c.country})}>{c.leagueLogo?<img src={c.leagueLogo} alt="" loading="lazy"/>:<span>⚽</span>}<b>{c.league}</b><small>{c.count}</small></button>)}</div>}</div>):<small className="sports-empty-competitions">No popular countries in the live feed</small>}</div>}</div>)}
        <div className="sidebar-help"><b>Need help?</b><p>Visit support or learn about responsible play.</p><Link href="/contact">Support centre</Link></div>
      </aside>
      <section className="sports-content">
        <div className="sports-hero sports-feed-hero melbet-style-hero"><div className="hero-promo-stack"><div className="feed-banner sports-banner-carousel promo-banner image-promo-banner"><img src={activePromo.image} alt={activePromo.name} loading="eager"/><button className="banner-arrow banner-prev" aria-label="Previous banner" onClick={()=>setBannerIndex(index=>(index+promoBanners.length-1)%promoBanners.length)}>‹</button><button className="banner-arrow banner-next" aria-label="Next banner" onClick={()=>setBannerIndex(index=>(index+1)%promoBanners.length)}>›</button><div className="banner-dots">{promoBanners.map((banner,index)=><button key={banner.name} className={index===bannerIndex%promoBanners.length?"active":""} aria-label={`Show ${banner.name}`} onClick={()=>setBannerIndex(index)}/>)}</div></div><div className="hero-wallet-strip"><div><small>Balance</small><b>TZS {(wallet?.availableBalanceTzs??0).toLocaleString("en-US")}</b></div><div><small>{featuredEvent?"Featured fixture":"Live feed"}</small><span>{featuredEvent?`${featuredEvent.home} vs ${featuredEvent.away}`:"The Odds API feed ready"}</span></div>{user?<button onClick={()=>openDepositModal(10000)}>Deposit funds</button>:<button onClick={()=>openLoginModal("register")}>Register</button>}</div></div></div>
        <div className="promo-cards"><article><span>LIVE</span><b>Current event odds</b><small>Markets loaded from the sportsbook API</small></article><article><span>SAFE</span><b>Wallet-backed tickets</b><small>Every stake and payout is recorded</small></article><article><span>FAST</span><b>Instant booking</b><small>Save and restore a ticket by code</small></article></div>
        <div className="sports-toolbar"><div><button onClick={()=>setTab("prematch")} className={tab==="prematch"?"active":""}>Pre-match</button><button onClick={()=>setTab("live")} className={tab==="live"?"active":""}><i/> Live now</button></div><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search team, league or country"/></label></div>
        <div className="quick-filters">{[["all","All"],["today","Today"],["tomorrow","Tomorrow"],["soon","Starting soon"]].map(([key,label])=><button onClick={()=>setTimeFilter(key as typeof timeFilter)} className={timeFilter===key?"active":""} key={key}>{label}</button>)}</div>
        <div className="mobile-filter-row">
          <label className="mobile-filter-pill"><span>{sportIcons[sport]??"⚽"}</span><select value={sport} onChange={e=>{setSport(e.target.value);setLeagueFilter(null)}}>{sportOptions.map(o=><option key={o.name} value={o.name}>{o.name}</option>)}</select><i>⌄</i></label>
          <label className="mobile-filter-pill"><span>Leagues</span><select value={leagueFilter?`${leagueFilter.country}|${leagueFilter.league}`:""} onChange={e=>{if(!e.target.value){setLeagueFilter(null);return}const[country,league]=e.target.value.split("|");setLeagueFilter({country,league})}}><option value="">All leagues</option>{(competitionsBySport[sport]??[]).map(c=><option key={`${c.country}|${c.league}`} value={`${c.country}|${c.league}`}>{c.league}</option>)}</select><i>⌄</i></label>
          <span className="mobile-filter-pill static"><span>Markets</span><i>⌄</i></span>
          <button className="mobile-filter-sort" aria-label="Sort events">⇅</button>
        </div>
        {eventsLoading&&<div className="sports-data-notice">Loading live sportsbook events...</div>}{!eventsLoading&&eventsNotice&&<div className="sports-data-notice">{eventsNotice} <button onClick={()=>setEventsReload(value=>value+1)}>Try again</button></div>}
        <div className="market-labels events-board-head"><div><span>{tab==="live"?"Live now":"Pre-match events"}</span><small>{visible.length} events · {visibleWithOdds} priced{visibleLive?` · ${visibleLive} live`:""}</small></div><div><b>1</b><b>X</b><b>2</b><b>More</b></div></div>
        <div className="event-list" id="events">
          {!eventsLoading&&visible.length===0&&<div className="no-events"><b>No events found</b><span>Try another sport, tab or search.</span></div>}
          {groupedVisible.map(group=><div className="league-group" key={group.key}>
            <div className="league-group-head">{group.leagueLogo?<img src={group.leagueLogo} alt="" loading="lazy"/>:<i className="league-group-flag">{group.country.slice(0,2).toUpperCase()}</i>}<span><b>{group.country}</b><small>{group.league}</small></span><em>{group.events.length}</em></div>
            {group.events.map(e=><article className="event-card" key={e.id}>
              <div className="event-meta"><button aria-label={`Save ${e.home} vs ${e.away}`}>☆</button><time dateTime={e.time} className={e.live?"is-live":""}><span>{formatMatchDate(e.time)}</span><b>{e.live?<><i/> LIVE {e.minute}</>:formatTime(e.time)}</b></time></div>
              <div className="event-body"><Link className="teams sports-feed-teams" href={`/sports/match/${e.id}`}><div><TeamLogo src={e.homeLogo} label={e.home}/><strong>{e.home}</strong><span>{e.live&&e.score?.split(" - ")[0]}</span></div><div><TeamLogo src={e.awayLogo} label={e.away}/><strong>{e.away}</strong><span>{e.live&&e.score?.split(" - ")[1]}</span></div><small>{e.live?"Live match result":"Match result"} · {e.more?`${e.more} extra markets`:"team visuals ready"}</small></Link><div className="odds-grid">{e.markets.length?e.markets.map(m=>{const id=`${e.id}-${m.outcomeId}`;return <button key={m.outcomeId} className={slip.some(s=>s.id===id)?"selected":""} onClick={()=>toggle(e,m)}><span>{m.label}</span><b>{m.odds.toFixed(2)}</b></button>}):<div className="odds-unavailable"><b>Odds pending</b><span>Waiting for The Odds API market</span></div>}<button className="more" aria-label={`Open more markets for ${e.home} vs ${e.away}`}>+{e.more}</button></div></div>
              <div className="event-footer"><button>▥ Stats</button><button>◉ Tracker</button><span>{e.live?`${formatMatchDate(e.time)} · ${e.score??"Live"}`:`${formatMatchDate(e.time)} · Starts ${formatTime(e.time)}`}</span></div>
            </article>)}
          </div>)}
        </div>
        <div className="responsible-strip"><b>18+</b><span><strong>Bet responsibly.</strong> Set limits, take breaks and never chase losses.</span><Link href="/responsible-play">Responsible gaming</Link></div>
      </section>
      {BetSlip({})}
    </section>
    <nav className="sports-mobile-nav"><Link href="/sports"><span>⚽</span>Sports</Link><Link href="/live"><span>●</span>Live</Link><button className="mobile-slip-button" onClick={()=>setMobileSlip(true)}><span>▤</span>Betslip<b>{slip.length}</b></button><Link href="/results"><span>✓</span>Results</Link><Link href="/dashboard"><span>◎</span>Account</Link></nav>
    {mobileSlip&&<div className="mobile-slip-wrap"><div className="mobile-slip-scrim" onClick={()=>setMobileSlip(false)}/>{BetSlip({mobile:true})}</div>}    <footer className="sports-footer">
      <div><Link className="sports-brand" href="/"><img src="/brand/icon/mb-mark-color.png" alt="MkwanjaBet"/><span className="sr-only">MkwanjaBet</span></Link><p>Secure, wallet-backed sports betting built for Tanzania.</p></div>
      <nav><Link href="/sports">Sports</Link><Link href="/my-bets">My bets</Link><Link href="/wallet/deposit">Deposit</Link><Link href="/contact">Support</Link></nav>
      <nav><Link href="/responsible-play">Responsible gaming</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/disclaimer">Rules</Link></nav>
      <div className="sports-footer-trust"><b>18+ only</b><span>Play responsibly. Never bet more than you can afford to lose.</span><small>© 2026 MkwanjaBet. All rights reserved.</small></div>
    </footer>
  </main>
}