import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BettingService } from "./betting.service";
import { PlaceBetDto, SaveBookingDto } from "./dto/betting.dto";

@Controller("betting")
export class BettingController {
  constructor(private readonly betting: BettingService) {}
  @Post("booking") saveBooking(@Body() dto: SaveBookingDto) { return this.betting.saveBooking(null, dto); }
  @Get("booking/:code") loadBooking(@Param("code") code: string) { return this.betting.loadBooking(code); }
  @UseGuards(JwtAuthGuard) @Post("validate") validate(@CurrentUser() user:{id:string}, @Body() dto:PlaceBetDto) { return this.betting.validate(user.id,dto); }
  @UseGuards(JwtAuthGuard) @Post("place") place(@CurrentUser() user:{id:string}, @Body() dto:PlaceBetDto) { return this.betting.place(user.id,dto); }
}
