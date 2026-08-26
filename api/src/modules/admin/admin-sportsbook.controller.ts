import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { EventStatus, MarketStatus, OutcomeStatus, Prisma } from "@prisma/client";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminAuditInterceptor } from "../audit/admin-audit.interceptor";
import { BettingService } from "../betting/betting.service";

class CreateEventDto {
  @IsString() sportId!: string; @IsString() competitionId!: string; @IsOptional() @IsString() countryId?: string;
  @IsString() @MaxLength(160) name!: string; @IsString() @MaxLength(180) slug!: string; @IsDateString() startsAt!: string;
  @IsOptional() @IsString() homeTeamName?: string; @IsOptional() @IsString() awayTeamName?: string; @IsOptional() @IsString() venue?: string;
}
class UpdateEventDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string; @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus; @IsOptional() @IsString() homeTeamName?: string;
  @IsOptional() @IsString() awayTeamName?: string; @IsOptional() @IsInt() @Min(0) homeScore?: number;
  @IsOptional() @IsInt() @Min(0) awayScore?: number; @IsOptional() @IsString() liveClock?: string;
  @IsOptional() @IsString() venue?: string; @IsOptional() @IsString() suspensionReason?: string;
}
class CreateMarketDto {
  @IsString() key!: string; @IsString() name!: string; @IsOptional() @IsNumber() line?: number; @IsOptional() @IsInt() sortOrder?: number;
}
class UpdateMarketDto {
  @IsOptional() @IsString() name?: string; @IsOptional() @IsEnum(MarketStatus) status?: MarketStatus;
  @IsOptional() @IsString() suspensionReason?: string; @IsOptional() @IsInt() sortOrder?: number;
}
class CreateOutcomeDto {
  @IsString() key!: string; @IsString() name!: string; @IsNumber() @Min(1.01) odds!: number; @IsOptional() @IsInt() sortOrder?: number;
}
class UpdateOutcomeDto {
  @IsOptional() @IsString() name?: string; @IsOptional() @IsEnum(OutcomeStatus) status?: OutcomeStatus;
  @IsOptional() @IsNumber() @Min(1.01) odds?: number;
}
class SettleMarketDto {
  @IsOptional() @IsString() winningOutcomeId?: string; @IsOptional() @IsBoolean() void?: boolean; @IsOptional() @IsString() result?: string;
}

@UseGuards(JwtAuthGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller("admin/sportsbook")
export class AdminSportsbookController {
  constructor(private readonly db: PrismaService, private readonly betting: BettingService) {}
  private admin(user: { role: string }) { if (user.role !== "ADMIN") throw new ForbiddenException("Admin access required"); }

  @Get("catalog")
  catalog(@CurrentUser() user: { role: string }) {
    this.admin(user);
    return this.db.sport.findMany({ where: { active: true }, include: { competitions: { where: { active: true }, orderBy: { name: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }

  @Get("events")
  events(@CurrentUser() user: { role: string }, @Query("q") query?: string) {
    this.admin(user);
    return this.db.event.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" } } : {},
      include: { sport: { select: { id: true, name: true } }, competition: { select: { id: true, name: true } }, markets: { include: { outcomes: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } },
      orderBy: [{ startsAt: "desc" }], take: 100,
    });
  }

  @Post("events")
  createEvent(@CurrentUser() user: { role: string }, @Body() dto: CreateEventDto) {
    this.admin(user);
    return this.db.event.create({ data: { ...dto, countryId: dto.countryId || null, startsAt: new Date(dto.startsAt), status: EventStatus.SCHEDULED } });
  }

  @Patch("events/:id")
  updateEvent(@CurrentUser() user: { role: string }, @Param("id") id: string, @Body() dto: UpdateEventDto) {
    this.admin(user);
    const suspended = dto.status === EventStatus.SUSPENDED;
    return this.db.event.update({ where: { id }, data: { ...dto, startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined, suspendedAt: suspended ? new Date() : dto.status ? null : undefined, suspensionReason: suspended ? dto.suspensionReason || "Suspended by operator" : dto.status ? null : undefined } });
  }

  @Post("events/:id/markets")
  createMarket(@CurrentUser() user: { role: string }, @Param("id") eventId: string, @Body() dto: CreateMarketDto) {
    this.admin(user);
    return this.db.market.create({ data: { eventId, key: dto.key, name: dto.name, line: dto.line, sortOrder: dto.sortOrder ?? 0 } });
  }

  @Patch("markets/:id")
  updateMarket(@CurrentUser() user: { role: string }, @Param("id") id: string, @Body() dto: UpdateMarketDto) {
    this.admin(user);
    const suspended = dto.status === MarketStatus.SUSPENDED;
    return this.db.market.update({ where: { id }, data: { ...dto, suspendedAt: suspended ? new Date() : dto.status ? null : undefined, suspensionReason: suspended ? dto.suspensionReason || "Suspended by operator" : dto.status ? null : undefined } });
  }

  @Post("markets/:id/outcomes")
  createOutcome(@CurrentUser() user: { role: string }, @Param("id") marketId: string, @Body() dto: CreateOutcomeDto) {
    this.admin(user);
    return this.db.$transaction(async tx => {
      const outcome = await tx.outcome.create({ data: { marketId, key: dto.key, name: dto.name, currentOdds: dto.odds, sortOrder: dto.sortOrder ?? 0 } });
      await tx.odds.create({ data: { outcomeId: outcome.id, price: dto.odds, source: "admin" } });
      return outcome;
    });
  }

  @Patch("outcomes/:id")
  updateOutcome(@CurrentUser() user: { role: string }, @Param("id") id: string, @Body() dto: UpdateOutcomeDto) {
    this.admin(user);
    return this.db.$transaction(async tx => {
      const current = await tx.outcome.findUniqueOrThrow({ where: { id } });
      if (dto.odds !== undefined && Number(current.currentOdds) !== dto.odds) {
        await tx.odds.create({ data: { outcomeId: id, price: dto.odds, previousPrice: current.currentOdds, source: "admin" } });
      }
      return tx.outcome.update({ where: { id }, data: { name: dto.name, status: dto.status, currentOdds: dto.odds } });
    });
  }

  @Post("markets/:id/settle")
  async settleMarket(@CurrentUser() user: { id: string; role: string }, @Param("id") id: string, @Body() dto: SettleMarketDto) {
    this.admin(user);
    return this.betting.settleMarket(user.id, id, { winningOutcomeId: dto.winningOutcomeId, void: dto.void, result: dto.result });
  }
}
