import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs"; import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service"; import { LoginDto, RegisterDto } from "./dto";
@Injectable() export class AuthService {
 constructor(private db:PrismaService,private jwt:JwtService,private config:ConfigService){}
 private safeUser(u:any){ const {passwordHash,...safe}=u; return safe; }
 private async issue(user:any){
  const accessToken=await this.jwt.signAsync({sub:user.id,role:user.role},{secret:this.config.getOrThrow("JWT_ACCESS_SECRET"),expiresIn:this.config.get("JWT_ACCESS_TTL")??"15m"});
  const refreshToken=await this.jwt.signAsync({sub:user.id,type:"refresh"},{secret:this.config.getOrThrow("JWT_REFRESH_SECRET"),expiresIn:this.config.get("JWT_REFRESH_TTL")??"30d"});
  const decoded=this.jwt.decode(refreshToken) as {exp:number};
  await this.db.refreshToken.create({data:{userId:user.id,tokenHash:createHash("sha256").update(refreshToken).digest("hex"),expiresAt:new Date(decoded.exp*1000)}});
  return {user:this.safeUser(user),accessToken,refreshToken};
 }
 async register(d:RegisterDto){ const exists=await this.db.user.findFirst({where:{OR:[{phone:d.phone},...(d.email?[{email:d.email}]:[])]}}); if(exists) throw new ConflictException("Phone or email already exists"); const user=await this.db.user.create({data:{name:d.name,phone:d.phone,email:d.email,passwordHash:await hash(d.password,12)}}); return this.issue(user); }
 async login(d:LoginDto){ const user=await this.db.user.findFirst({where:{OR:[{phone:d.identifier},{email:d.identifier}]}}); if(!user||user.status!=="ACTIVE"||!(await compare(d.password,user.passwordHash))) throw new UnauthorizedException("Invalid credentials"); await this.db.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}}); return this.issue(user); }
 async refresh(token:string){ try { const p=await this.jwt.verifyAsync<{sub:string;type:string}>(token,{secret:this.config.getOrThrow("JWT_REFRESH_SECRET")}); if(p.type!=="refresh") throw new Error(); const h=createHash("sha256").update(token).digest("hex"); const stored=await this.db.refreshToken.findUnique({where:{tokenHash:h},include:{user:true}}); if(!stored||stored.revokedAt||stored.expiresAt<new Date()) throw new Error(); await this.db.refreshToken.update({where:{id:stored.id},data:{revokedAt:new Date()}}); return this.issue(stored.user); } catch { throw new UnauthorizedException("Invalid refresh token"); } }
 async logout(token:string){ const h=createHash("sha256").update(token).digest("hex"); await this.db.refreshToken.updateMany({where:{tokenHash:h,revokedAt:null},data:{revokedAt:new Date()}}); return {success:true}; }
 async me(id:string){ const u=await this.db.user.findUnique({where:{id},include:{subscriptions:{where:{status:"ACTIVE"},include:{plan:true},orderBy:{expiresAt:"desc"},take:1}}}); if(!u) throw new UnauthorizedException(); return this.safeUser(u); }
}
