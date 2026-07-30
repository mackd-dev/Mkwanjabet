import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { BookingCodesService } from "./booking-codes.service";
import { SaveBookingCodeDto, ValidateBetPreviewDto } from "./dto/booking-code.dto";

@Controller("betting")
export class BookingCodesController {
  constructor(private readonly bookingCodes: BookingCodesService) {}

  @Post("booking")
  save(@Body() dto: SaveBookingCodeDto) {
    return this.bookingCodes.save(dto);
  }

  @Get("booking/:code")
  load(@Param("code") code: string) {
    return this.bookingCodes.load(code);
  }

  @Post("validate-preview")
  validatePreview(@Body() dto: ValidateBetPreviewDto) {
    return this.bookingCodes.validatePreview(dto);
  }
}
