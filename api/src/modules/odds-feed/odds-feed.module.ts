import { Module } from "@nestjs/common";
import { BettingModule } from "../betting/betting.module";
import { OddsApiFeedController } from "./odds-api-feed.controller";
import { OddsApiFeedService } from "./odds-api-feed.service";

@Module({
  imports: [BettingModule],
  controllers: [OddsApiFeedController],
  providers: [OddsApiFeedService],
})
export class OddsFeedModule {}
