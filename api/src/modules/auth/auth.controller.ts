import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto, RefreshDto, RegisterDto } from "./dto";
function meta(req:Request){return {userAgent:req.get("user-agent")?.slice(0,500),ipAddress:req.ip}}
@Controller("auth")
export class AuthController {
 constructor(private s:AuthService){}
 @Throttle({default:{limit:10,ttl:60000}}) @Post("register") register(@Body()d:RegisterDto,@Req()req:Request){return this.s.register(d,meta(req))}
 @Throttle({default:{limit:10,ttl:60000}}) @Post("login") login(@Body()d:LoginDto,@Req()req:Request){return this.s.login(d,meta(req))}
 @Post("refresh") refresh(@Body()d:RefreshDto,@Req()req:Request){return this.s.refresh(d.refreshToken,meta(req))}
 @Post("logout") logout(@Body()d:RefreshDto){return this.s.logout(d.refreshToken)}
 @UseGuards(JwtAuthGuard) @Get("me") me(@CurrentUser()u:{id:string}){return this.s.me(u.id)}
}
