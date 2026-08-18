import { Module } from "@nestjs/common";
import { OddsApiFeedController } from "./odds-api-feed.controller";
import { OddsApiFeedService } from "./odds-api-feed.service";

@Module({
  controllers: [OddsApiFeedController],
  providers: [OddsApiFeedService],
})
export class OddsFeedModule {}
