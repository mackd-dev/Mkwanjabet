import { Module } from "@nestjs/common";
import { BettingModule } from "../betting/betting.module";
import { AuditModule } from "../audit/audit.module";
import { AdminController } from "./admin.controller";
import { AdminSportsbookController } from "./admin-sportsbook.controller";
@Module({imports:[BettingModule,AuditModule],controllers:[AdminController,AdminSportsbookController]})
export class AdminModule {}
