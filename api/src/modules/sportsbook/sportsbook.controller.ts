import { Controller, Get, Param, Query } from "@nestjs/common";
import { SportsbookService } from "./sportsbook.service";

@Controller()
export class SportsbookController {
  constructor(private readonly sportsbook: SportsbookService) {}

  @Get("sports")
  sports() {
    return this.sportsbook.sports();
  }

  @Get("competitions")
  competitions(@Query("sportId") sportId?: string, @Query("countryId") countryId?: string) {
    return this.sportsbook.competitions({ sportId, countryId });
  }

  @Get("events")
  events(
    @Query("sportId") sportId?: string,
    @Query("competitionId") competitionId?: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.sportsbook.events({ sportId, competitionId, status, from, to });
  }

  @Get("events/:id")
  event(@Param("id") id: string) {
    return this.sportsbook.event(id);
  }

  @Get("events/:id/markets")
  markets(@Param("id") id: string) {
    return this.sportsbook.markets(id);
  }
}
