"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/api-client";
import { authenticatedApiRequest, getCurrentUser, logoutSession, type SessionUser } from "../lib/session";

type View = "wallet"|"deposit"|"withdraw"|"bets"|"profile"|"kyc"|"limits";
type Tx={id:string;type:string;method:string;amount:number;status:string;date:string};
type Bet={id:string;bookingCode?:string;type:"Single"|"Accumulator";status:"Open"|"Won"|"Lost"|"Void"|"Cashed out";stake:number;odds:number;returnAmount:number;cashOut?:number;date:string;settledAt?:string;selections:{eventId:string;marketId:string;outcomeId:string;match:string,market:string,pick:string,odd:number,state:string}[]};
type ApiBet=Bet&{betId:string;rawStatus:string;acceptedAt?:string};
type ApiTransaction={id:string;type:string;status:string;amountTzs:number;provider?:string|null;reference:string;description?:string|null;createdAt:string};
type Wallet={availableBalanceTzs:number;withdrawableTzs:number;bonusBalanceTzs:number;lockedBalanceTzs:number;transactions:ApiTransaction[]};
type AccountSession={id:string;userAgent?:string|null;ipAddress?:string|null;createdAt:string;expiresAt:string};
const money=(n:number)=>new Intl.NumberFormat("en-TZ").format(n)+" TZS";
const demoBets:Bet[]=[
{id:"MB-884291",bookingCode:"MKB-A71F3C-8D2A",type:"Accumulator",status:"Open",stake:10000,odds:8.24,returnAmount:82400,cashOut:61200,date:"Today, 13:08",selections:[{eventId:"arsenal-vs-chelsea-sportsbook",marketId:"match-result",outcomeId:"home",match:"Arsenal vs Chelsea",market:"Match Winner",pick:"Arsenal",odd:2.05,state:"Pending"},{eventId:"real-madrid-vs-bayern-sportsbook",marketId:"total-goals",outcomeId:"over-2-5",match:"Real Madrid vs Bayern Munich",market:"Total Goals 2.5",pick:"Over 2.5",odd:1.78,state:"Pending"},{eventId:"young-africans-vs-azam-sportsbook",marketId:"match-result",outcomeId:"home",match:"Young Africans vs Azam FC",market:"Match Winner",pick:"Young Africans",odd:2.26,state:"Pending"}]},
{id:"MB-883907",bookingCode:"MKB-77B91E-A104",type:"Accumulator",status:"Won",stake:5000,odds:6.12,returnAmount:30600,date:"Yesterday, 18:42",settledAt:"Yesterday, 22:41",selections:[{eventId:"liverpool-vs-fulham-demo",marketId:"match-result",outcomeId:"home",match:"Liverpool vs Fulham",market:"Match Winner",pick:"Liverpool",odd:1.62,state:"Won"},{eventId:"psg-vs-lille-demo",marketId:"total-goals",outcomeId:"over-1-5",match:"PSG vs Lille",market:"Total Goals",pick:"Over 1.5",odd:1.35,state:"Won"},{eventId:"inter-vs-parma-demo",marketId:"handicap",outcomeId:"home-minus-1",match:"Inter vs Parma",market:"Handicap",pick:"Inter -1",odd:2.80,state:"Won"}]},
{id:"MB-879221",type:"Accumulator",status:"Lost",stake:3000,odds:4.44,returnAmount:0,date:"25 Jul, 20:19",settledAt:"25 Jul, 22:04",selections:[{eventId:"juventus-vs-napoli-demo",marketId:"both-teams-to-score",outcomeId:"yes",match:"Juventus vs Napoli",market:"Both Teams To Score",pick:"Yes",odd:1.92,state:"Won"},{eventId:"valencia-vs-betis-demo",marketId:"match-result",outcomeId:"home",match:"Valencia vs Betis",market:"Match Winner",pick:"Valencia",odd:2.31,state:"Lost"}]},
{id:"MB-878402",type:"Single",status:"Void",stake:2000,odds:1.88,returnAmount:2000,date:"24 Jul, 19:10",settledAt:"24 Jul, 20:02",selections:[{eventId:"simba-vs-prisons-demo",marketId:"total-goals",outcomeId:"under-2-5",match:"Simba SC vs Tanzania Prisons",market:"Total Goals 2.5",pick:"Under 2.5",odd:1.88,state:"Void"}]},
];
const methods=[{name:"M-Pesa",code:"MP",hint:"Vodacom Tanzania"},{name:"Mixx by Yas",code:"MY",hint:"Yas Tanzania"},{name:"Airtel Money",code:"AM",hint:"Airtel Tanzania"},{name:"HaloPesa",code:"HP",hint:"Halotel Tanzania"}];
function shortDate(value:string){try{return new Intl.DateTimeFormat("en-TZ",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value))}catch{return value}}
function transactionLabel(type:string){return ({DEPOSIT:"Deposit",WITHDRAWAL:"Withdrawal",BET_STAKE:"Bet stake",BET_WIN:"Bet winnings",BET_REFUND:"Bet refund",CASH_OUT:"Cash out",BONUS_CREDIT:"Bonus credit",BONUS_DEBIT:"Bonus debit",ADJUSTMENT:"Adjustment"} as Record<string,string>)[type]??type}
function providerLabel(provider?:string|null){return ({MPESA:"M-Pesa",MIXX_BY_YAS:"Mixx by Yas",AIRTEL_MONEY:"Airtel Money",HALOPESA:"HaloPesa",TPESA:"T-Pesa",MANUAL:"Manual"} as Record<string,string>)[provider??""]??"Wallet"}
function providerCode(method:string){return ({"M-Pesa":"MPESA","Mixx by Yas":"MIXX_BY_YAS","Airtel Money":"AIRTEL_MONEY",HaloPesa:"HALOPESA"} as Record<string,string>)[method]}
function apiMessage(error:unknown){if(error instanceof ApiError&&error.payload&&typeof error.payload==="object"){const message=(error.payload as {message?:unknown}).message;if(typeof message==="string")return message;if(Array.isArray(message))return message.join(". ")}return "Request could not be completed. Please try again."}

export default function AccountHub({initial="wallet"}:{initial?:View}){
 const router=useRouter();
 const [user,setUser]=useState<SessionUser|null>(null); const [wallet,setWallet]=useState<Wallet|null>(null); const [sessionReady,setSessionReady]=useState(false); const [loggingOut,setLoggingOut]=useState(false); const [walletBusy,setWalletBusy]=useState<"deposit"|"withdraw"|null>(null); const [walletError,setWalletError]=useState(""); const [profileName,setProfileName]=useState(""); const [profileEmail,setProfileEmail]=useState(""); const [currentPassword,setCurrentPassword]=useState(""); const [newPassword,setNewPassword]=useState(""); const [securityBusy,setSecurityBusy]=useState(false); const [sessions,setSessions]=useState<AccountSession[]>([]);
 const [view,setView]=useState<View>(initial); const [betFilter,setBetFilter]=useState("All"); const [method,setMethod]=useState("M-Pesa"); const [amount,setAmount]=useState("10000"); const [expanded,setExpanded]=useState<string|null>("MB-884291"); const [notice,setNotice]=useState(""); const [realBets,setRealBets]=useState<Bet[]|null>(null); const [betsNotice,setBetsNotice]=useState("Showing preview tickets until your real wallet bets load.");
 const accountBets=realBets?.length?realBets:demoBets;
 const transactions:Tx[]=(wallet?.transactions??[]).map(tx=>({id:tx.reference,type:transactionLabel(tx.type),method:providerLabel(tx.provider),amount:tx.amountTzs,status:tx.status[0]+tx.status.slice(1).toLowerCase(),date:shortDate(tx.createdAt)}));
 const shown=useMemo(()=>accountBets.filter(b=>betFilter==="All"||b.status===betFilter),[accountBets,betFilter]);
 const nav:(readonly [View,string,string])[]=[["wallet","Wallet","◈"],["bets","My Bets","▣"],["deposit","Deposit","＋"],["withdraw","Withdraw","↗"],["profile","Profile","◎"],["kyc","Verification","✓"],["limits","Play limits","◷"]];
 function submit(label:string){setNotice(`${label} request captured in demo mode. It is ready for the production API connection.`);setTimeout(()=>setNotice(""),5000)}
 useEffect(()=>{
  let mounted=true;
  async function loadAccount(){
   let currentUser:SessionUser;
   try{currentUser=await getCurrentUser()}
   catch{if(mounted)router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);return}
   if(!mounted)return;
   setUser(currentUser);setProfileName(currentUser.name);setProfileEmail(currentUser.email??"");setSessionReady(true);
   try{
    const data=await authenticatedApiRequest<ApiBet[]>("/betting/my-bets");
    if(!mounted)return;
    const mapped=data.map(b=>({...b,date:shortDate(b.date),settledAt:b.settledAt?shortDate(b.settledAt):undefined}));
    setRealBets(mapped);setExpanded(mapped[0]?.id??null);setBetsNotice(mapped.length?`${mapped.length} real ticket${mapped.length===1?"":"s"} loaded from your account.`:"No real bets found yet. Place a ticket from the sportsbook to see it here.");
   }catch{if(mounted)setBetsNotice("Could not load real bets from your account.")}
   try{const walletData=await authenticatedApiRequest<Wallet>("/wallet/me");if(mounted)setWallet(walletData)}
   catch{if(mounted)setNotice("Wallet data could not be loaded.")}
   try{const activeSessions=await authenticatedApiRequest<AccountSession[]>("/users/me/sessions");if(mounted)setSessions(activeSessions)}catch{}
  }
  void loadAccount();
  return()=>{mounted=false};
 },[router]);
 async function pollDeposit(reference:string){
  for(let attempt=0;attempt<6;attempt++){
   await new Promise(resolve=>setTimeout(resolve,5000));
   try{
    const entry=await authenticatedApiRequest<ApiTransaction>(`/wallet/deposit/${encodeURIComponent(reference)}/status`,{method:"POST"});
    const walletData=await authenticatedApiRequest<Wallet>("/wallet/me");setWallet(walletData);
    if(entry.status==="COMPLETED"){setNotice("Deposit confirmed. Your wallet balance has been updated.");return}
    if(entry.status==="FAILED"){setWalletError("The deposit was not completed. Please try again.");return}
   }catch{return}
  }
 } async function submitWallet(type:"deposit"|"withdraw"){
  const amountTzs=Number(amount);
  setNotice("");setWalletError("");
  if(!Number.isInteger(amountTzs)||amountTzs<1000||amountTzs>10000000){setWalletError("Enter an amount between 1,000 and 10,000,000 TZS.");return}
  setWalletBusy(type);
  try{
   const entry=await authenticatedApiRequest<ApiTransaction>(`/wallet/${type}`,{method:"POST",body:JSON.stringify({provider:providerCode(method),phone:user?.phone,amountTzs})});
   const walletData=await authenticatedApiRequest<Wallet>("/wallet/me");
   setWallet(walletData);setNotice(type==="deposit"?"Push USSD sent. Approve the payment on your phone.":"Withdrawal request received and marked pending.");setView("wallet");
   if(type==="deposit")void pollDeposit(entry.reference);
  }catch(error){setWalletError(apiMessage(error))}
  finally{setWalletBusy(null)}
 }
 async function saveProfile(){
  setSecurityBusy(true);setNotice("");setWalletError("");
  try{const updated=await authenticatedApiRequest<SessionUser>("/users/me",{method:"PATCH",body:JSON.stringify({name:profileName.trim(),...(profileEmail.trim()?{email:profileEmail.trim().toLowerCase()}: {})})});setUser(updated);localStorage.setItem("mkwanjabet_user",JSON.stringify(updated));setNotice("Profile updated successfully.")}
  catch(error){setWalletError(apiMessage(error))}finally{setSecurityBusy(false)}
 }
 async function changePassword(){
  setSecurityBusy(true);setNotice("");setWalletError("");
  try{await authenticatedApiRequest("/users/me/password",{method:"POST",body:JSON.stringify({currentPassword,newPassword})});await logoutSession();router.replace("/login")}
  catch(error){setWalletError(apiMessage(error));setSecurityBusy(false)}
 }
 async function revokeAllSessions(){
  setSecurityBusy(true);setNotice("");setWalletError("");
  try{await authenticatedApiRequest("/users/me/sessions",{method:"DELETE"});await logoutSession();router.replace("/login")}
  catch(error){setWalletError(apiMessage(error));setSecurityBusy(false)}
 } async function handleLogout(){
  setLoggingOut(true);
  try{await logoutSession()}finally{router.replace("/login");router.refresh()}
 }
 if(!sessionReady||!user)return <main className="ah-session-loading" role="status"><span></span><p>Inafungua akaunti yako...</p></main>;
 const initials=user.name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"MB";
 return <main className="ah-page">
  <header className="ah-top"><Link className="ah-brand" href="/sports"><span>M</span>Mkwanja<b>Bet</b></Link><nav><Link href="/sports">Sports</Link><Link href="/live">Live</Link><Link href="/jackpot">Jackpots</Link><Link href="/promotions">Promotions</Link></nav><div className="ah-user"><span>{initials}</span><div><b>{user.name}</b><small>{user.status==="ACTIVE"?"Active account":"Signed in"}</small></div></div></header>
  {notice&&<div className="ah-toast">✓ {notice}</div>}{walletError&&<div className="ah-toast error" role="alert">{walletError}</div>}
  <div className="ah-layout">
   <aside className="ah-side"><div className="ah-profile"><span>{initials}</span><div><b>{user.name}</b><small>{user.phone}</small></div><i>{user.status==="ACTIVE"?"ACTIVE":"SIGNED IN"}</i></div><div className="ah-side-balance"><small>AVAILABLE BALANCE</small><strong>{money(wallet?.availableBalanceTzs??0)}</strong><span>Bonus: {money(wallet?.bonusBalanceTzs??0)}</span></div><nav>{nav.map(([k,l,i])=><button key={k} className={view===k?"active":""} onClick={()=>setView(k)}><i>{i}</i>{l}<b>›</b></button>)}</nav><Link href="/sports">← Back to sportsbook</Link><button className="ah-logout" onClick={handleLogout} disabled={loggingOut}>{loggingOut?"Signing out...":"Sign out"}</button></aside>
   <section className="ah-content">
    {view==="wallet"&&<><div className="ah-heading"><div><span>MY ACCOUNT</span><h1>Wallet overview</h1><p>Your balances and account activity in one secure place.</p></div><button onClick={()=>setView("deposit")}>＋ Deposit</button></div><div className="ah-balances"><article className="main"><small>AVAILABLE BALANCE</small><strong>{money(wallet?.availableBalanceTzs??0)}</strong><p>Ready to bet or withdraw</p><div><button onClick={()=>setView("deposit")}>Deposit</button><button onClick={()=>setView("withdraw")}>Withdraw</button></div></article><article><span>◎</span><small>WITHDRAWABLE</small><strong>{money(wallet?.withdrawableTzs??0)}</strong><p>Available after settled bets</p></article><article><span>★</span><small>BONUS BALANCE</small><strong>{money(wallet?.bonusBalanceTzs??0)}</strong><p>Subject to wagering rules</p></article></div><div className="ah-panel"><div className="ah-panel-head"><div><h2>Recent transactions</h2><p>Every wallet movement is recorded.</p></div><button>Download statement</button></div><TransactionTable items={transactions}/></div></>}
    {view==="deposit"&&<><PageTitle eyebrow="WALLET" title="Deposit funds" text="Choose your mobile-money provider and enter the amount."/><div className="ah-form-grid"><div className="ah-panel"><h2>Select payment method</h2><div className="ah-methods">{methods.map(m=><button className={method===m.name?"active":""} onClick={()=>setMethod(m.name)} key={m.name}><b>{m.code}</b><span><strong>{m.name}</strong><small>{m.hint}</small></span><i>{method===m.name?"●":"○"}</i></button>)}</div><label className="ah-field"><span>Mobile number</span><div><b>+255</b><input value={user.phone.replace(/^\+255/,"")} readOnly/></div></label><label className="ah-field"><span>Deposit amount</span><div><b>TZS</b><input value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,""))}/></div></label><div className="ah-chips">{[5000,10000,20000,50000].map(x=><button onClick={()=>setAmount(String(x))} key={x}>{new Intl.NumberFormat().format(x)}</button>)}</div><button className="ah-primary" onClick={()=>submitWallet("deposit")} disabled={walletBusy!==null}>{walletBusy==="deposit"?"Submitting...":`Deposit ${money(Number(amount)||0)}`}</button></div><SummaryCard type="deposit" amount={Number(amount)||0} method={method}/></div></>}
    {view==="withdraw"&&<><PageTitle eyebrow="WALLET" title="Withdraw winnings" text="Send withdrawable funds to a verified mobile-money account."/><div className="ah-form-grid"><div className="ah-panel"><h2>Withdrawal details</h2><label className="ah-field"><span>Send to</span><select value={method} onChange={e=>setMethod(e.target.value)}>{methods.map(m=><option key={m.name}>{m.name}</option>)}</select></label><label className="ah-field"><span>Verified mobile number</span><div><b>+255</b><input value={user.phone.replace(/^\+255/,"")} readOnly/></div></label><label className="ah-field"><span>Amount</span><div><b>TZS</b><input value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,""))}/></div></label><div className="ah-withdrawable"><span>Withdrawable balance</span><b>{money(wallet?.withdrawableTzs??0)}</b></div><button className="ah-primary" onClick={()=>submitWallet("withdraw")} disabled={walletBusy!==null}>{walletBusy==="withdraw"?"Submitting...":"Request withdrawal"}</button></div><SummaryCard type="withdraw" amount={Number(amount)||0} method={method}/></div></>}
    {view==="bets"&&<><PageTitle eyebrow="BET HISTORY" title="My bets" text="Real wallet-backed tickets load here when your session has an API token."/><div className="ah-ticket-note"><b>{realBets?.length?"Live account data":"Preview mode"}</b><span>{betsNotice}</span></div><div className="ah-bet-tabs">{["All","Open","Won","Lost","Void","Cashed out"].map(x=><button className={betFilter===x?"active":""} onClick={()=>setBetFilter(x)} key={x}>{x}<span>{x==="All"?accountBets.length:accountBets.filter(b=>b.status===x).length}</span></button>)}</div><div className="ah-bets">{shown.map(b=><article key={b.id} className={`status-${b.status.toLowerCase().replace(" ","-")}`}><header><div><small>{b.type.toUpperCase()} TICKET</small><b>{b.id}</b><span>{b.bookingCode?`Booking ${b.bookingCode}`:"Direct ticket"} · {b.date}</span></div><i>{b.status}</i></header><div className="ah-bet-summary"><span><small>STAKE</small><b>{money(b.stake)}</b></span><span><small>TOTAL ODDS</small><b>{b.odds.toFixed(2)}</b></span><span><small>{b.status==="Won"?"WINNINGS":b.status==="Void"?"REFUND":"POTENTIAL RETURN"}</small><b>{money(b.returnAmount)}</b></span><button onClick={()=>setExpanded(expanded===b.id?null:b.id)}>{expanded===b.id?"Hide":"View"} ticket</button></div>{expanded===b.id&&<div className="ah-selections"><div className="ah-ticket-note"><b>{b.status==="Open"?"Open ticket":b.settledAt?"Settled ticket":"Ticket"}</b><span>{b.status==="Open"?"Stake is locked until this ticket is settled or cashed out.":b.settledAt?`Settled ${b.settledAt}.`:"Ticket details recorded."}</span></div>{b.selections.map((s,i)=><div key={`${s.eventId}-${s.marketId}-${s.outcomeId}`}><span>{i+1}</span><div><b>{s.pick}</b><small>{s.match} · {s.market}</small><small>Event {s.eventId} · Outcome {s.outcomeId}</small></div><strong>{s.odd.toFixed(2)}</strong><i>{s.state}</i></div>)}{b.status==="Open"&&<button onClick={()=>submit("Cash-out preview")}>Cash out preview · {money(b.cashOut??0)}</button>}</div>}</article>)}</div></>}
    {view==="profile"&&<><PageTitle eyebrow="ACCOUNT" title="Personal details" text="Keep your contact and security information current."/><div className="ah-panel ah-profile-form"><div className="ah-avatar">{initials}</div><div className="ah-form-two"><label className="ah-field"><span>Full name</span><input value={profileName} onChange={e=>setProfileName(e.target.value)}/></label><label className="ah-field"><span>Phone number</span><input value={user.phone} readOnly/></label><label className="ah-field"><span>Email address</span><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)}/></label><label className="ah-field"><span>Phone verification</span><input value={user.phoneVerifiedAt?"Verified":"Not verified"} readOnly/></label></div><button className="ah-primary" onClick={saveProfile} disabled={securityBusy}>Save changes</button></div><div className="ah-panel ah-security ah-security-form"><h2>Change password</h2><div className="ah-form-two"><label className="ah-field"><span>Current password</span><input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label className="ah-field"><span>New password</span><input type="password" minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label></div><button className="ah-primary" onClick={changePassword} disabled={securityBusy||currentPassword.length<1||newPassword.length<8}>Change password</button><div className="ah-session-summary"><span><b>Active sessions</b><small>{sessions.length} signed-in {sessions.length===1?"device":"devices"}</small></span><button onClick={revokeAllSessions} disabled={securityBusy||sessions.length===0}>Sign out all devices</button></div>{sessions.map(session=><div className="ah-session-row" key={session.id}><span><b>{session.userAgent?.split(" ").slice(0,3).join(" ")||"Unknown device"}</b><small>{session.ipAddress||"Unknown IP"} · {shortDate(session.createdAt)}</small></span></div>)}</div></>}
    {view==="kyc"&&<><PageTitle eyebrow="IDENTITY VERIFICATION" title="Verify your account" text="Complete KYC before withdrawals and higher account limits."/><div className="ah-kyc-progress"><div className="done"><b>✓</b><span><strong>Phone verified</strong><small>Completed</small></span></div><i></i><div className="active"><b>2</b><span><strong>Identity details</strong><small>In progress</small></span></div><i></i><div><b>3</b><span><strong>Review</strong><small>Usually under 24 hours</small></span></div></div><div className="ah-panel"><h2>NIDA information</h2><div className="ah-form-two"><label className="ah-field"><span>NIDA number</span><input placeholder="20 digits" maxLength={20}/></label><label className="ah-field"><span>Date of birth</span><input type="date"/></label></div><div className="ah-upload-grid"><label><b>＋</b><strong>Upload NIDA front</strong><small>JPG, PNG or PDF · Max 5MB</small><input type="file" hidden/></label><label><b>＋</b><strong>Upload NIDA back</strong><small>JPG, PNG or PDF · Max 5MB</small><input type="file" hidden/></label><label><b>⌁</b><strong>Take a selfie</strong><small>Clear face, good lighting</small><input type="file" accept="image/*" capture="user" hidden/></label></div><label className="ah-check"><input type="checkbox"/> I confirm that the information belongs to me and is accurate.</label><button className="ah-primary" onClick={()=>submit("KYC submission")}>Submit for verification</button></div></>}
    {view==="limits"&&<><PageTitle eyebrow="RESPONSIBLE PLAY" title="Stay in control" text="Set personal limits that support a safe betting experience."/><div className="ah-limit-grid"><LimitCard title="Deposit limit" desc="Maximum amount you can deposit." value="100,000"/><LimitCard title="Loss limit" desc="Maximum net loss allowed." value="50,000"/><LimitCard title="Stake limit" desc="Maximum stake per ticket." value="20,000"/><LimitCard title="Session reminder" desc="Receive a time reminder while playing." value="60 minutes"/></div><div className="ah-panel ah-timeout"><div><span>◷</span><div><h2>Take a break</h2><p>Temporarily lock betting and deposits while keeping access to withdrawals and history.</p></div></div><select><option>24 hours</option><option>7 days</option><option>30 days</option></select><button onClick={()=>submit("Time-out")}>Activate time-out</button></div></>}
   </section>
  </div>
  <nav className="ah-mobile-nav">{nav.slice(0,5).map(([k,l,i])=><button className={view===k?"active":""} onClick={()=>setView(k)} key={k}><i>{i}</i><small>{l}</small></button>)}</nav>
 </main>
}
function PageTitle({eyebrow,title,text}:{eyebrow:string,title:string,text:string}){return <div className="ah-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div></div>}
function TransactionTable({items}:{items:Tx[]}){if(!items.length)return <div className="ah-ticket-note"><b>No transactions yet</b><span>Your completed wallet activity will appear here.</span></div>;return <div className="ah-table">{items.map(t=><div key={t.id}><span className={t.amount>0?"in":"out"}>{t.amount>0?"↓":"↑"}</span><div><b>{t.type}</b><small>{t.method} · {t.id}</small></div><time>{t.date}</time><strong className={t.amount>0?"positive":""}>{t.amount>0?"+":""}{money(t.amount)}</strong><i className={t.status.toLowerCase()}>{t.status}</i></div>)}</div>}
function SummaryCard({type,amount,method}:{type:string,amount:number,method:string}){return <aside className="ah-summary"><span>SECURE {type.toUpperCase()}</span><h2>Transaction summary</h2><div><small>Method</small><b>{method}</b></div><div><small>Amount</small><b>{money(amount)}</b></div><div><small>Fee</small><b>{money(0)}</b></div><div className="total"><small>{type==="deposit"?"You receive":"Amount sent"}</small><strong>{money(amount)}</strong></div><p>🔒 Your request is protected and will be recorded in the wallet ledger.</p></aside>}
function LimitCard({title,desc,value}:{title:string,desc:string,value:string}){return <article className="ah-limit-card"><span>◉</span><div><h2>{title}</h2><p>{desc}</p></div><select defaultValue="Daily"><option>Daily</option><option>Weekly</option><option>Monthly</option></select><label><b>TZS</b><input defaultValue={value}/></label><button>Update limit</button></article>}



