import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { CasinoService } from "./casino.service";

class LaunchCasinoGameDto { @IsOptional() @IsString() userId?: string; }
class AviatorBetDto { @IsString() session: string; @IsInt() @Min(100) @Max(50000) stakeTzs: number; }
class AviatorCashoutDto { @IsString() session: string; }

@Controller("casino")
export class CasinoController {
  constructor(private readonly casino: CasinoService) {}

  @Get("games") games() { return this.casino.listGames(); }
  @Post("games/:id/launch") launch(@Param("id") id: string, @Body() dto: LaunchCasinoGameDto) { return this.casino.launchGame(id, dto.userId); }
  @Get("aviator/current") aviatorCurrent(@Query("session") session?: string) { return this.casino.aviatorCurrent(session); }
  @Post("aviator/bet") aviatorBet(@Body() dto: AviatorBetDto) { return this.casino.aviatorBet(dto.session, dto.stakeTzs); }
  @Post("aviator/cashout") aviatorCashout(@Body() dto: AviatorCashoutDto) { return this.casino.aviatorCashout(dto.session); }
}