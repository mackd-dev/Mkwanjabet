import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from "class-validator";
export class RegisterDto { @IsString() @Length(2,80) name:string; @Matches(/^\+?[1-9]\d{8,14}$/) phone:string; @IsOptional() @IsEmail() email?:string; @MinLength(8) password:string; }
export class LoginDto { @IsString() identifier:string; @IsString() password:string; }
export class RefreshDto { @IsString() refreshToken:string; }
