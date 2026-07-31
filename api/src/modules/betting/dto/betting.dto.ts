import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

export class BetSelectionDto {
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

export class SaveBookingDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => BetSelectionDto)
  selections!: BetSelectionDto[];
  @IsOptional() @IsInt() @Min(0) stakeTzs?: number;
}

export class PlaceBetDto extends SaveBookingDto {
  @IsInt() @Min(1) declare stakeTzs: number;
  @IsOptional() @IsString() bookingCode?: string;
  @IsOptional() @IsBoolean() acceptOddsChanges?: boolean;
}

export class PlaceBookingDto {
  @IsInt() @Min(1) stakeTzs!: number;
  @IsOptional() @IsBoolean() acceptOddsChanges?: boolean;
}
