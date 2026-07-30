import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BookingSelectionDto, SaveBookingCodeDto } from "./dto/booking-code.dto";

@Injectable()
export class BookingCodesService {
  constructor(private readonly db: PrismaService) {}

  private code() {
    return `MKB-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
  }

  private assertSelections(selections: BookingSelectionDto[]) {
    const markets = new Set<string>();
    for (const item of selections) {
      const key = `${item.eventId}:${item.marketId}`;
      if (markets.has(key)) throw new BadRequestException(`Only one outcome from ${item.matchName} / ${item.marketName} is allowed`);
      markets.add(key);
    }
  }

  async save(dto: SaveBookingCodeDto) {
    this.assertSelections(dto.selections);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 8; i++) {
      try {
        const booking = await this.db.bookingCode.create({
          data: {
            code: this.code(),
            stakeTzs: dto.stakeTzs,
            selections: dto.selections as unknown as Prisma.InputJsonValue,
            expiresAt,
          },
        });
        return this.toResponse(booking);
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      }
    }
    throw new BadRequestException("Could not generate a unique booking code");
  }

  async load(code: string) {
    const booking = await this.db.bookingCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!booking) throw new NotFoundException("Booking code not found");
    if (booking.status !== "ACTIVE" || booking.expiresAt <= new Date()) {
      if (booking.status === "ACTIVE") await this.db.bookingCode.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Booking code has expired or is no longer active");
    }
    return this.toResponse(booking);
  }

  private toResponse(booking: { code: string; stakeTzs: number | null; selections: Prisma.JsonValue; expiresAt: Date; createdAt: Date }) {
    return {
      code: booking.code,
      stakeTzs: booking.stakeTzs,
      selections: booking.selections,
      expiresAt: booking.expiresAt,
      createdAt: booking.createdAt,
    };
  }
}
