import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSourcingItemDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  unitHint?: string;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

export class UpdateSourcingItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  unitHint?: string;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class QuerySourcingItemsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class ReorderSourcingItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}

export class SourcingDeliveryAddressDto {
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

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateSourcingRequestItemDto {
  /** Catalog item — omit when adding a custom free-text item */
  @ValidateIf((o: CreateSourcingRequestItemDto) => !o.name?.trim())
  @IsString()
  @IsNotEmpty()
  sourcingItemId?: string;

  /** Custom item name — required when sourcingItemId is omitted */
  @ValidateIf((o: CreateSourcingRequestItemDto) => !o.sourcingItemId)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSourcingRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSourcingRequestItemDto)
  items: CreateSourcingRequestItemDto[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SourcingDeliveryAddressDto)
  deliveryAddress: SourcingDeliveryAddressDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QuerySourcingRequestsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['PENDING', 'CANCELLED', 'COMPLETED'])
  status?: 'PENDING' | 'CANCELLED' | 'COMPLETED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class UpdateSourcingRequestStatusDto {
  @IsIn(['PENDING', 'CANCELLED', 'COMPLETED'])
  status: 'PENDING' | 'CANCELLED' | 'COMPLETED';
}
