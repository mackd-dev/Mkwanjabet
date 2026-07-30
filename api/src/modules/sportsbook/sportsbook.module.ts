import { Module } from "@nestjs/common";
import { SportsbookController } from "./sportsbook.controller";
import { SportsbookService } from "./sportsbook.service";

@Module({ controllers: [SportsbookController], providers: [SportsbookService] })
export class SportsbookModule {}
