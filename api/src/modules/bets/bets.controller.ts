import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
@UseGuards(JwtAuthGuard) @Controller("bets")
export class BetsController { constructor(private db:PrismaService){} @Get("me") list(@CurrentUser()u:{id:string}){return this.db.bet.findMany({where:{userId:u.id},include:{selections:true},orderBy:{placedAt:"desc"}})} @Get(":id") detail(@CurrentUser()u:{id:string},@Param("id")id:string){return this.db.bet.findFirst({where:{id,userId:u.id},include:{selections:true}})} @Post(":id/cash-out") async cashOut(@CurrentUser()u:{id:string},@Param("id")id:string){const bet=await this.db.bet.findFirstOrThrow({where:{id,userId:u.id,status:{in:["ACCEPTED","LIVE"]}}});if(!bet.cashOutOfferTzs)return {ok:false,message:"Cash out is not available"};return {ok:true,message:"Cash-out request accepted",offerTzs:bet.cashOutOfferTzs};}}
