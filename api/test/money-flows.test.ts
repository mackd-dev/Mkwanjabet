import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { SelectionStatus } from "@prisma/client";
import { BettingService } from "../src/modules/betting/betting.service";
import { SonicPesaService } from "../src/modules/wallet/sonicpesa.service";

const selection = { eventId:"event-1",sport:"forged",league:"forged",marketId:"market-1",outcomeId:"outcome-1",matchName:"forged",marketName:"forged",selection:"forged",odds:2 };
const controls:any={settings:async()=>({bettingEnabled:true,requirePhoneVerificationForBetting:false,maximumUnverifiedStakeTzs:50000,maximumUnverifiedPayoutTzs:500000})};
function outcome(odds=2){return {id:"outcome-1",marketId:"market-1",name:"Home",status:"ACTIVE",currentOdds:odds,market:{id:"market-1",name:"Match Winner",status:"OPEN",event:{id:"event-1",slug:"event-one",name:"Home vs Away",status:"SCHEDULED",sport:{name:"Football"},competition:{name:"League"}}}}}

function placementDb(balance=1000){
 const state={available:balance,locked:0,version:0,bets:0,transactions:0};
 const db:any={user:{findUnique:async()=>({phoneVerifiedAt:null})},outcome:{findUnique:async()=>outcome()},stakeLimit:{findMany:async()=>[]},wallet:{findUnique:async()=>({id:"wallet-1",userId:"user-1",availableBalanceTzs:state.available,lockedBalanceTzs:state.locked,version:state.version})}};
 const tx:any={wallet:{findUniqueOrThrow:async()=>({id:"wallet-1",userId:"user-1",availableBalanceTzs:state.available,lockedBalanceTzs:state.locked,version:state.version}),updateMany:async({where,data}:any)=>{if(where.version!==state.version||state.available<where.availableBalanceTzs.gte)return{count:0};state.available-=data.availableBalanceTzs.decrement;state.locked+=data.lockedBalanceTzs.increment;state.version++;return{count:1}}},bet:{create:async({data}:any)=>{state.bets++;return{id:`bet-${state.bets}`,ticketCode:data.ticketCode,selections:data.selections.create,history:data.history.create}}},walletTransaction:{create:async()=>{state.transactions++;return{}}},exposure:{upsert:async()=>({})},bookingCode:{updateMany:async()=>({count:0})}};
 db.$transaction=async(fn:any)=>fn(tx);return{db,state};
}

test("validation rejects stale odds unless explicitly accepted",async()=>{
 const db:any={user:{findUnique:async()=>({phoneVerifiedAt:null})},outcome:{findUnique:async()=>outcome(2.25)},stakeLimit:{findMany:async()=>[]},wallet:{findUnique:async()=>({availableBalanceTzs:5000})}};
 const service=new BettingService(db,controls);
 await assert.rejects(()=>service.validate("user-1",{selections:[selection],stakeTzs:500,acceptOddsChanges:false}),BadRequestException);
 const accepted=await service.validate("user-1",{selections:[selection],stakeTzs:500,acceptOddsChanges:true});
 assert.equal(accepted.valid,true);assert.equal(accepted.selections[0].odds,2.25);assert.equal(accepted.selections[0].selection,"Home");
});

test("operator switch blocks betting immediately",async()=>{
 const db:any={user:{findUnique:async()=>({phoneVerifiedAt:null})},outcome:{findUnique:async()=>outcome()},stakeLimit:{findMany:async()=>[]},wallet:{findUnique:async()=>({availableBalanceTzs:5000})}};
 const stopped:any={settings:async()=>({bettingEnabled:false,maintenanceMessage:"Betting paused"})};
 const service=new BettingService(db,stopped);
 await assert.rejects(()=>service.validate("user-1",{selections:[selection],stakeTzs:500,acceptOddsChanges:true}),/Betting paused/);
});
test("concurrent placements cannot overspend one wallet",async()=>{
 const {db,state}=placementDb(1000);const service=new BettingService(db,controls);const dto={selections:[selection],stakeTzs:750,acceptOddsChanges:true};
 const results=await Promise.allSettled([service.place("user-1",dto),service.place("user-1",dto)]);
 assert.equal(results.filter(x=>x.status==="fulfilled").length,1);assert.equal(results.filter(x=>x.status==="rejected").length,1);
 assert.deepEqual({available:state.available,locked:state.locked,bets:state.bets,transactions:state.transactions},{available:250,locked:750,bets:1,transactions:1});
});

function settlementDb(selectionStatus=SelectionStatus.WON){
 const state={betStatus:"ACCEPTED",available:0,withdrawable:0,locked:1000,credits:0,history:0,selectionStatus:"PENDING"};
 const betSelection={id:"sel-1",betId:"bet-1",outcomeId:"outcome-1",externalEventId:"event-1",marketId:"market-1",status:state.selectionStatus,odds:2};
 const tx:any={outcome:{findUnique:async()=>({id:"outcome-1"})},betSelection:{findMany:async()=>state.selectionStatus==="PENDING"&&["ACCEPTED","LIVE"].includes(state.betStatus)?[{id:"sel-1",betId:"bet-1"}]:[],updateMany:async({data}:any)=>{state.selectionStatus=data.status;betSelection.status=data.status;return{count:1}}},bet:{findUniqueOrThrow:async()=>({id:"bet-1",userId:"user-1",ticketCode:"MB-1",status:state.betStatus,stakeTzs:1000,potentialReturnTzs:2000,selections:[betSelection]}),updateMany:async({data}:any)=>{if(!["ACCEPTED","LIVE"].includes(state.betStatus))return{count:0};state.betStatus=data.status;return{count:1}}},wallet:{findUniqueOrThrow:async()=>({id:"wallet-1",availableBalanceTzs:state.available,lockedBalanceTzs:state.locked}),update:async({data}:any)=>{state.locked-=data.lockedBalanceTzs.decrement;state.available+=data.availableBalanceTzs.increment;state.withdrawable+=data.withdrawableTzs.increment;return{}}},walletTransaction:{create:async()=>{state.credits++;return{}}},betStatusHistory:{create:async()=>{state.history++;return{}}},exposure:{updateMany:async()=>({count:1})}};
 const db:any={$transaction:async(fn:any)=>fn(tx)};return{db,state,status:selectionStatus};
}

test("winning settlement credits wallet exactly once",async()=>{
 const {db,state}=settlementDb();const service=new BettingService(db,controls);
 const first=await service.settleOutcome("admin","outcome-1",SelectionStatus.WON,"2-0");const second=await service.settleOutcome("admin","outcome-1",SelectionStatus.WON,"2-0");
 assert.equal(first.betsSettled.length,1);assert.equal(second.betsSettled.length,0);assert.deepEqual({status:state.betStatus,available:state.available,withdrawable:state.withdrawable,locked:state.locked,credits:state.credits,history:state.history},{status:"WON",available:2000,withdrawable:2000,locked:0,credits:1,history:1});
});

test("void settlement refunds the original stake",async()=>{
 const {db,state}=settlementDb();const service=new BettingService(db,controls);await service.settleOutcome("admin","outcome-1",SelectionStatus.VOID,"abandoned");
 assert.deepEqual({status:state.betStatus,available:state.available,locked:state.locked,credits:state.credits},{status:"VOID",available:1000,locked:0,credits:1});
});

test("SonicPesa signature verification rejects tampering",()=>{
 const secret="test-secret";const config:any={get:(key:string)=>key==="SONICPESA_API_SECRET"?secret:undefined};const service=new SonicPesaService({} as any,config);const body=Buffer.from('{"order_id":"1"}');const signature=createHmac("sha256",secret).update(body).digest("hex");
 assert.equal(service.verify(body,signature),true);assert.equal(service.verify(Buffer.from('{"order_id":"2"}'),signature),false);assert.equal(service.verify(body,"bad"),false);
});

test("duplicate SonicPesa success webhooks credit a deposit once",async()=>{
 const state={status:"PENDING",available:0,withdrawable:0,credits:0};const entry={id:"tx-1",walletId:"wallet-1",providerRef:"order-1",amountTzs:5000,get status(){return state.status}};
 const tx:any={walletTransaction:{findUnique:async()=>entry,updateMany:async()=>{if(state.status==="COMPLETED")return{count:0};state.status="COMPLETED";return{count:1}}},wallet:{update:async({data}:any)=>{state.available+=data.availableBalanceTzs.increment;state.withdrawable+=data.withdrawableTzs.increment;state.credits++;return{}}}};
 const db:any={$transaction:async(fn:any)=>fn(tx),walletTransaction:{updateMany:async()=>({count:0})}};const config:any={get:()=>undefined};const service=new SonicPesaService(db,config);const payload={event:"payment.success",order_id:"order-1",amount:5000,currency:"TZS",status:"SUCCESS"};
 await Promise.all([service.handleWebhook(payload),service.handleWebhook(payload)]);assert.deepEqual(state,{status:"COMPLETED",available:5000,withdrawable:5000,credits:1});
});