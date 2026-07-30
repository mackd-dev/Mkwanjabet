import { BadRequestException, Body, Controller, Get, Param, Post, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import { IsEnum, IsInt, Matches, Max, Min } from "class-validator";
import { PaymentProvider } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SonicPesaService } from "./sonicpesa.service";
class MoneyRequestDto { @IsEnum(PaymentProvider) provider!: PaymentProvider; @Matches(/^\+?[1-9]\d{8,14}$/) phone!: string; @IsInt() @Min(1000) @Max(10000000) amountTzs!: number; }
@UseGuards(JwtAuthGuard)
@Controller("wallet")
export class WalletController {
 constructor(private db:PrismaService,private sonic:SonicPesaService) {}
 @Get("me") async wallet(@CurrentUser() u:{id:string}) { return this.db.wallet.upsert({where:{userId:u.id},update:{},create:{userId:u.id},include:{transactions:{orderBy:{createdAt:"desc"},take:50}}}); }
 @Get("transactions") async transactions(@CurrentUser() u:{id:string}) { const w=await this.db.wallet.findUnique({where:{userId:u.id}}); if(!w) return []; return this.db.walletTransaction.findMany({where:{walletId:w.id},orderBy:{createdAt:"desc"},take:100}); }
 @Post("deposit") deposit(@CurrentUser() u:{id:string},@Body() d:MoneyRequestDto){return this.sonic.createDeposit(u.id,d.amountTzs,d.provider)}
 @Post("deposit/:reference/status") depositStatus(@CurrentUser() u:{id:string},@Param("reference") reference:string){return this.sonic.refreshDeposit(u.id,reference)}
 @Post("withdraw") async withdraw(@CurrentUser() u:{id:string},@Body() d:MoneyRequestDto){ const w=await this.db.wallet.upsert({where:{userId:u.id},update:{},create:{userId:u.id}}); if(w.withdrawableTzs<d.amountTzs) throw new BadRequestException("Insufficient withdrawable balance"); throw new ServiceUnavailableException("SonicPesa payouts will be enabled after account verification"); }
}
