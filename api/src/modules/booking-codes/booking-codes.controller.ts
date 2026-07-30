import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BookingCodesService } from "./booking-codes.service";
import { PlaceBetDto, SaveBookingCodeDto, ValidateBetPreviewDto } from "./dto/booking-code.dto";

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

  @UseGuards(JwtAuthGuard)
  @Post("validate")
  validate(@CurrentUser() user: { id: string }, @Body() dto: ValidateBetPreviewDto) {
    return this.bookingCodes.validateForUser(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("place")
  place(@CurrentUser() user: { id: string }, @Body() dto: PlaceBetDto) {
    return this.bookingCodes.placeBet(user.id, dto);
  }
}
