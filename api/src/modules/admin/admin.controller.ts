import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { BetStatus, LimitScope, SelectionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BettingService } from "../betting/betting.service";
class SettleOutcomeDto { @IsEnum(SelectionStatus) status!:SelectionStatus; @IsOptional() @IsString() result?:string; }
class LimitDto { @IsEnum(LimitScope) scope!:LimitScope; @IsString() referenceId!:string; @IsInt() @Min(0) minimumStakeTzs!:number; @IsInt() @Min(1) maximumStakeTzs!:number; @IsInt() @Min(1) maximumPayoutTzs!:number; @IsNumber() @Min(1.01) maximumOdds!:number; @IsInt() @Min(1) maximumSelections!:number; @IsOptional() @IsInt() priority?:number; @IsOptional() @IsBoolean() active?:boolean; }
@UseGuards(JwtAuthGuard) @Controller("admin/risk")
export class AdminController {
 constructor(private db:PrismaService, private betting:BettingService){}
 private admin(u:{role:string}){if(u.role!=="ADMIN")throw new ForbiddenException("Admin access required")}
 @Get("dashboard") async dashboard(@CurrentUser()u:{role:string}){this.admin(u);const [bets,stake,payout,exposure,highRisk]=await Promise.all([this.db.bet.count(),this.db.bet.aggregate({_sum:{stakeTzs:true}}),this.db.bet.aggregate({_sum:{payoutTzs:true}}),this.db.exposure.aggregate({_sum:{liabilityTzs:true}}),this.db.exposure.findMany({orderBy:{liabilityTzs:"desc"},take:20})]);return{bets,totalStakeTzs:stake._sum.stakeTzs??0,totalPayoutTzs:payout._sum.payoutTzs??0,openLiabilityTzs:exposure._sum.liabilityTzs??0,highRisk};}
 @Post("outcomes/:id/settle") settleOutcome(@CurrentUser()u:{id:string;role:string},@Param("id")id:string,@Body()d:SettleOutcomeDto){this.admin(u);return this.betting.settleOutcome(u.id,id,d.status,d.result)}
 @Get("bets") async bets(@CurrentUser()u:{role:string},@Query("status")status?:BetStatus){this.admin(u);return this.db.bet.findMany({where:status?{status}:{},include:{user:{select:{id:true,name:true,phone:true}},selections:true},orderBy:{placedAt:"desc"},take:200});}
 @Get("bookings") async bookings(@CurrentUser()u:{role:string}){this.admin(u);return this.db.bookingCode.findMany({orderBy:{createdAt:"desc"},take:200});}
 @Patch("bookings/:id/cancel") async cancel(@CurrentUser()u:{role:string},@Param("id")id:string){this.admin(u);return this.db.bookingCode.update({where:{id},data:{status:"CANCELLED"}})}
 @Get("limits") async limits(@CurrentUser()u:{role:string}){this.admin(u);return this.db.stakeLimit.findMany({orderBy:[{priority:"desc"},{updatedAt:"desc"}]});}
 @Post("limits") async limit(@CurrentUser()u:{role:string},@Body()d:LimitDto){this.admin(u);return this.db.stakeLimit.upsert({where:{scope_referenceId:{scope:d.scope,referenceId:d.referenceId}},create:d,update:d});}
}
