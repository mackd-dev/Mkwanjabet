import { Body, Controller, Headers, HttpCode, Post, RawBodyRequest, Req, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { SonicPesaService } from "./sonicpesa.service";
@Controller("payments/sonicpesa")
export class SonicPesaController {
 constructor(private sonic:SonicPesaService){}
 @Post("webhook") @HttpCode(200) webhook(@Req() req:RawBodyRequest<Request>,@Headers("x-sonicpesa-signature") signature:string|undefined,@Body() body:any){if(!req.rawBody||!this.sonic.verify(req.rawBody,signature))throw new UnauthorizedException("Invalid webhook signature");return this.sonic.handleWebhook(body)}
}
