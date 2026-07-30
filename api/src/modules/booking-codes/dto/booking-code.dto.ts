import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

export class BookingSelectionDto {
  @IsString() eventId!: string;
  @IsString() sport!: string;
  @IsString() league!: string;
  @IsString() marketId!: string;
  @IsString() outcomeId!: string;
  @IsString() matchName!: string;
  @IsString() marketName!: string;
  @IsString() selection!: string;
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(1.01) @Max(10000) odds!: number;
}

export class SaveBookingCodeDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => BookingSelectionDto)
  selections!: BookingSelectionDto[];

  @IsOptional() @IsInt() @Min(0)
  stakeTzs?: number;
}

export class ValidateBetPreviewDto extends SaveBookingCodeDto {
  @IsInt() @Min(1)
  declare stakeTzs: number;
}

export class PlaceBetDto extends ValidateBetPreviewDto {
  @IsOptional() @IsString()
  bookingCode?: string;
}
