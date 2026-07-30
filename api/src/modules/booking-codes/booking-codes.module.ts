import { Module } from "@nestjs/common";
import { BookingCodesController } from "./booking-codes.controller";
import { BookingCodesService } from "./booking-codes.service";

@Module({ controllers: [BookingCodesController], providers: [BookingCodesService] })
export class BookingCodesModule {}
