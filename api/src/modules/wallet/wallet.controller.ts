import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsEnum, IsInt, IsString, Matches, Max, Min } from "class-validator";
import { PaymentProvider } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
class MoneyRequestDto { @IsEnum(PaymentProvider) provider!: PaymentProvider; @Matches(/^\+?[1-9]\d{8,14}$/) phone!: string; @IsInt() @Min(1000) @Max(10000000) amountTzs!: number; }
@UseGuards(JwtAuthGuard)
@Controller("wallet")
export class WalletController {
 constructor(private db: PrismaService) {}
 @Get("me") async wallet(@CurrentUser() u:{id:string}) { return this.db.wallet.upsert({where:{userId:u.id},update:{},create:{userId:u.id},include:{transactions:{orderBy:{createdAt:"desc"},take:50}}}); }
 @Get("transactions") async transactions(@CurrentUser() u:{id:string}) { const w=await this.db.wallet.findUnique({where:{userId:u.id}}); if(!w) return []; return this.db.walletTransaction.findMany({where:{walletId:w.id},orderBy:{createdAt:"desc"},take:100}); }
 @Post("deposit") async deposit(@CurrentUser() u:{id:string},@Body() d:MoneyRequestDto){ const w=await this.db.wallet.upsert({where:{userId:u.id},update:{},create:{userId:u.id}}); return this.db.walletTransaction.create({data:{walletId:w.id,type:"DEPOSIT",status:"PENDING",amountTzs:d.amountTzs,provider:d.provider,reference:`DEP-${Date.now()}`,description:`Deposit request for ${d.phone}`,metadata:{phone:d.phone}}}); }
 @Post("withdraw") async withdraw(@CurrentUser() u:{id:string},@Body() d:MoneyRequestDto){ const w=await this.db.wallet.upsert({where:{userId:u.id},update:{},create:{userId:u.id}}); if(w.withdrawableTzs<d.amountTzs) return {ok:false,message:"Insufficient withdrawable balance"}; return this.db.walletTransaction.create({data:{walletId:w.id,type:"WITHDRAWAL",status:"PENDING",amountTzs:-d.amountTzs,provider:d.provider,reference:`WDR-${Date.now()}`,description:`Withdrawal request for ${d.phone}`,metadata:{phone:d.phone}}}); }
}
