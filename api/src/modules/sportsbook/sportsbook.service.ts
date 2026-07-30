import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const outcomeInclude = {
  orderBy: { sortOrder: "asc" as const },
  include: { oddsHistory: { orderBy: { effectiveAt: "desc" as const }, take: 1 } },
};

const marketInclude = {
  orderBy: { sortOrder: "asc" as const },
  include: { outcomes: outcomeInclude },
};

@Injectable()
export class SportsbookService {
  constructor(private readonly db: PrismaService) {}

  sports() {
    return this.db.sport.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        countries: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        _count: { select: { competitions: true, events: true } },
      },
    });
  }

  competitions(filters: { sportId?: string; countryId?: string }) {
    return this.db.competition.findMany({
      where: { active: true, sportId: filters.sportId, countryId: filters.countryId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        sport: true,
        country: true,
        seasons: { where: { active: true }, orderBy: [{ current: "desc" }, { startsAt: "desc" }] },
        _count: { select: { events: true } },
      },
    });
  }

  events(filters: { sportId?: string; competitionId?: string; status?: string; from?: string; to?: string }) {
    const where: Prisma.EventWhereInput = {
      sportId: filters.sportId,
      competitionId: filters.competitionId,
      status: this.parseStatus(filters.status),
      startsAt: this.dateRange(filters.from, filters.to),
    };

    return this.db.event.findMany({
      where,
      orderBy: [{ startsAt: "asc" }, { name: "asc" }],
      include: {
        sport: true,
        country: true,
        competition: true,
        season: true,
        homeTeam: true,
        awayTeam: true,
        markets: { where: { status: { not: "CLOSED" } }, ...marketInclude },
      },
    });
  }

  async event(id: string) {
    const event = await this.db.event.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        sport: true,
        country: true,
        competition: true,
        season: true,
        homeTeam: true,
        awayTeam: true,
        markets: marketInclude,
      },
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async markets(eventId: string) {
    const event = await this.db.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }] },
      select: { id: true },
    });
    if (!event) throw new NotFoundException("Event not found");
    return this.db.market.findMany({
      where: { eventId: event.id },
      ...marketInclude,
    });
  }

  private parseStatus(status?: string): EventStatus | undefined {
    if (!status) return undefined;
    if (!Object.values(EventStatus).includes(status as EventStatus)) {
      throw new BadRequestException(`Unsupported event status: ${status}`);
    }
    return status as EventStatus;
  }

  private dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = this.parseDate(from, "from");
    if (to) range.lte = this.parseDate(to, "to");
    return range;
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid ${field} date`);
    return date;
  }
}
