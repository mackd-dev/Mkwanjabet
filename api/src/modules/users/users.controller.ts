import { Body, ConflictException, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import { IsEmail, IsOptional, IsString, Length, MinLength } from "class-validator";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
class UpdateProfileDto { @IsOptional() @IsString() @Length(2,80) name?:string; @IsOptional() @IsEmail() email?:string; }
class ChangePasswordDto { @IsString() currentPassword!:string; @IsString() @MinLength(8) newPassword!:string; }
const profileSelect={id:true,name:true,phone:true,email:true,role:true,status:true,phoneVerifiedAt:true,createdAt:true} as const;
@UseGuards(JwtAuthGuard)
@Controller("users/me")
export class UsersController {
 constructor(private db:PrismaService){}
 @Get() get(@CurrentUser()u:{id:string}){return this.db.user.findUnique({where:{id:u.id},select:profileSelect})}
 @Patch() async update(@CurrentUser()u:{id:string},@Body()d:UpdateProfileDto){
  if(d.email){const owner=await this.db.user.findFirst({where:{email:d.email,id:{not:u.id}},select:{id:true}});if(owner)throw new ConflictException("Email is already in use")}
  return this.db.user.update({where:{id:u.id},data:{...d,email:d.email?.toLowerCase()},select:profileSelect});
 }
 @Post("password") async password(@CurrentUser()u:{id:string},@Body()d:ChangePasswordDto){
  const user=await this.db.user.findUniqueOrThrow({where:{id:u.id}});if(!(await compare(d.currentPassword,user.passwordHash)))throw new UnauthorizedException("Current password is incorrect");
  await this.db.$transaction([this.db.user.update({where:{id:u.id},data:{passwordHash:await hash(d.newPassword,12)}}),this.db.refreshToken.updateMany({where:{userId:u.id,revokedAt:null},data:{revokedAt:new Date()}})]);return {success:true};
 }
 @Get("sessions") sessions(@CurrentUser()u:{id:string}){return this.db.refreshToken.findMany({where:{userId:u.id,revokedAt:null,expiresAt:{gt:new Date()}},select:{id:true,userAgent:true,ipAddress:true,createdAt:true,expiresAt:true},orderBy:{createdAt:"desc"}})}
 @Delete("sessions/:id") async revoke(@CurrentUser()u:{id:string},@Param("id")id:string){await this.db.refreshToken.updateMany({where:{id,userId:u.id,revokedAt:null},data:{revokedAt:new Date()}});return {success:true}}
 @Delete("sessions") async revokeAll(@CurrentUser()u:{id:string}){await this.db.refreshToken.updateMany({where:{userId:u.id,revokedAt:null},data:{revokedAt:new Date()}});return {success:true}}
}
