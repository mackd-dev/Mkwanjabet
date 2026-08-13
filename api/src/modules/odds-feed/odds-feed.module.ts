import { Module } from "@nestjs/common";
import { OddsFeedController } from "./odds-feed.controller";
import { OddsFeedService } from "./odds-feed.service";
import { LeonBetFeedController } from "./leonbet-feed.controller";
import { LeonBetFeedService } from "./leonbet-feed.service";

@Module({
  controllers: [OddsFeedController, LeonBetFeedController],
  providers: [OddsFeedService, LeonBetFeedService],
})
export class OddsFeedModule {}
