import { Module } from "@nestjs/common";
import { OddsFeedController } from "./odds-feed.controller";
import { OddsFeedService } from "./odds-feed.service";
import { OddsApiFeedController } from "./odds-api-feed.controller";
import { OddsApiFeedService } from "./odds-api-feed.service";

@Module({
  controllers: [OddsFeedController, OddsApiFeedController],
  providers: [OddsFeedService, OddsApiFeedService],
})
export class OddsFeedModule {}
