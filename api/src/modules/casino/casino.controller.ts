import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { CasinoService } from "./casino.service";

class LaunchCasinoGameDto {
  @IsOptional()
  @IsString()
  userId?: string;
}

@Controller("casino")
export class CasinoController {
  constructor(private readonly casino: CasinoService) {}

  @Get("games")
  games() {
    return this.casino.listGames();
  }

  @Post("games/:id/launch")
  launch(@Param("id") id: string, @Body() dto: LaunchCasinoGameDto) {
    return this.casino.launchGame(id, dto.userId);
  }
}