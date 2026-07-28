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

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  mealId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  extras?: unknown;
}

export class DeliveryAddressDto {
  /** Street / house number / estate */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  line1: string;

  /** Apartment, floor, etc. */
  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  /** Required for Terminal Africa rates */
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

  /** Rider / delivery contact phone */
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress: DeliveryAddressDto;

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Terminal Africa rate from POST /shipping/rates.
   * When set, deliveryFee comes from that live rate (not settings.deliveryFee).
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shippingRateId?: string;
}
