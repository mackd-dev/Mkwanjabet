import { Controller, ForbiddenException, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OddsApiFeedService } from "./odds-api-feed.service";

@UseGuards(JwtAuthGuard)
@Controller("admin/odds-api-feed")
export class OddsApiFeedController {
  constructor(private readonly feed: OddsApiFeedService) {}
  private admin(user: { role: string }) {
    if (user.role !== "ADMIN") throw new ForbiddenException("Admin access required");
  }
  @Get("status") status(@CurrentUser() user: { role: string }) {
    this.admin(user);
    return this.feed.status();
  }
  @Post("sync") sync(@CurrentUser() user: { role: string }) {
    this.admin(user);
    return this.feed.sync();
  }
}
