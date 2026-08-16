import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BettingService } from "./betting.service";
import { PlaceBetDto, PlaceBookingDto, SaveBookingDto } from "./dto/betting.dto";

@Controller("betting")
export class BettingController {
  constructor(private readonly betting: BettingService) {}
  @Post("booking") saveBooking(@Body() dto: SaveBookingDto) { return this.betting.saveBooking(null, dto); }
  @UseGuards(JwtAuthGuard) @Get("booking/:code") bookingQuote(@CurrentUser() user:{id:string}, @Param("code") code:string) { return this.betting.quoteBooking(user.id,code); }
  @UseGuards(JwtAuthGuard) @Get("booking/:code/quote") quoteBooking(@CurrentUser() user:{id:string}, @Param("code") code:string) { return this.betting.quoteBooking(user.id,code); }
  @UseGuards(JwtAuthGuard) @Post("booking/:code/place") placeBooking(@CurrentUser() user:{id:string}, @Param("code") code:string, @Body() dto:PlaceBookingDto) { return this.betting.placeBooking(user.id,code,dto.stakeTzs,dto.acceptOddsChanges); }
  @UseGuards(JwtAuthGuard) @Post("validate") validate(@CurrentUser() user:{id:string}, @Body() dto:PlaceBetDto) { return this.betting.validate(user.id,dto); }
  @UseGuards(JwtAuthGuard) @Post("place") place(@CurrentUser() user:{id:string}, @Body() dto:PlaceBetDto) { return this.betting.place(user.id,dto); }
  @UseGuards(JwtAuthGuard) @Get("my-bets") myBets(@CurrentUser() user:{id:string}) { return this.betting.myBets(user.id); }
}
