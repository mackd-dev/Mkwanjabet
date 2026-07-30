import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

type SonicOrder = { status:string; message?:string; data?:{order_id:string;reference?:string;payment_status:string;amount:number;currency:string;transid?:string|null;channel?:string|null} };
type SonicWebhook = { event:string; order_id:string; amount:number; currency:string; status:string; transid?:string; channel?:string; reference?:string; msisdn?:string; payment_status?:string };

@Injectable()
export class SonicPesaService {
 constructor(private db:PrismaService,private config:ConfigService){}
 private base(){return this.config.get("SONICPESA_BASE_URL")??"https://api.sonicpesa.com/api/v1"}
 private key(){const key=this.config.get<string>("SONICPESA_API_KEY");if(!key)throw new ServiceUnavailableException("SonicPesa is not configured");return key}
 private async request(path:string,body:unknown):Promise<SonicOrder>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
  try{
   const response=await fetch(`${this.base()}${path}`,{method:"POST",headers:{"Content-Type":"application/json","X-API-KEY":this.key()},body:JSON.stringify(body),signal:controller.signal});
   const payload=await response.json().catch(()=>null) as SonicOrder|null;
   if(!response.ok||!payload||payload.status!=="success")throw new BadGatewayException(payload?.message??"SonicPesa request failed");
   return payload;
  }catch(error){if(error instanceof BadGatewayException||error instanceof ServiceUnavailableException)throw error;throw new BadGatewayException("SonicPesa is currently unavailable")}
  finally{clearTimeout(timeout)}
 }
 async createDeposit(userId:string,amountTzs:number,provider:string){
  const user=await this.db.user.findUniqueOrThrow({where:{id:userId}});
  const wallet=await this.db.wallet.upsert({where:{userId},update:{},create:{userId}});
  const response=await this.request("/payment/create_order",{buyer_email:user.email??"payments@mkwanjabet.co.tz",buyer_name:user.name,buyer_phone:user.phone.replace(/^\+/,""),amount:amountTzs,currency:"TZS"});
  if(!response.data?.order_id)throw new BadGatewayException("SonicPesa returned an invalid order");
  return this.db.walletTransaction.create({data:{walletId:wallet.id,type:"DEPOSIT",status:"PENDING",amountTzs,provider:provider as never,providerRef:response.data.order_id,reference:`DEP-${Date.now()}`,description:"SonicPesa Push USSD deposit",metadata:{sonicReference:response.data.reference,sonicStatus:response.data.payment_status}}});
 }
 verify(rawBody:Buffer,signature?:string){
  const secret=this.config.get<string>("SONICPESA_API_SECRET");if(!secret||!signature)return false;
  const expected=createHmac("sha256",secret).update(rawBody).digest("hex");
  const supplied=signature.trim();if(expected.length!==supplied.length)return false;
  return timingSafeEqual(Buffer.from(expected),Buffer.from(supplied));
 }
 async handleWebhook(payload:SonicWebhook){
  if(!payload.order_id)return {received:true};
  if(payload.event==="payment.success"||payload.status==="SUCCESS")await this.completeDeposit(payload.order_id,payload.amount,payload.currency,payload.transid,payload.channel,payload.reference);
  else if(["CANCELLED","USERCANCELLED","REJECTED"].includes(payload.status))await this.db.walletTransaction.updateMany({where:{providerRef:payload.order_id,status:{not:"COMPLETED"}},data:{status:"FAILED",description:`SonicPesa deposit ${payload.status.toLowerCase()}`}});
  return {received:true};
 }
 private async completeDeposit(orderId:string,amount:number,currency:string,transid?:string,channel?:string,reference?:string){
  if(currency!=="TZS")return;
  await this.db.$transaction(async tx=>{
   const entry=await tx.walletTransaction.findUnique({where:{providerRef:orderId}});if(!entry||entry.amountTzs!==Number(amount)||entry.status==="COMPLETED")return;
   const changed=await tx.walletTransaction.updateMany({where:{id:entry.id,status:{not:"COMPLETED"}},data:{status:"COMPLETED",providerRef:orderId,completedAt:new Date(),description:"SonicPesa deposit completed",metadata:{transid,channel,reference}}});
   if(changed.count===1)await tx.wallet.update({where:{id:entry.walletId},data:{availableBalanceTzs:{increment:entry.amountTzs},withdrawableTzs:{increment:entry.amountTzs},version:{increment:1}}});
  });
 }
 async refreshDeposit(userId:string,reference:string){
  const entry=await this.db.walletTransaction.findFirst({where:{reference,wallet:{userId},type:"DEPOSIT"}});if(!entry?.providerRef)throw new BadGatewayException("Deposit order was not found");
  const response=await this.request("/payment/order_status",{order_id:entry.providerRef});const data=response.data;
  if(data?.payment_status==="SUCCESS")await this.completeDeposit(entry.providerRef,Number(data.amount),data.currency,data.transid??undefined,data.channel??undefined,data.reference);
  return this.db.walletTransaction.findUnique({where:{id:entry.id}});
 }
}


