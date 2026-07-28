import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ShippingDeliveryAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  line1: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ShippingRateItemDto {
  @IsString()
  @IsNotEmpty()
  mealId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class GetShippingRatesDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ShippingDeliveryAddressDto)
  deliveryAddress: ShippingDeliveryAddressDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShippingRateItemDto)
  items: ShippingRateItemDto[];
}
