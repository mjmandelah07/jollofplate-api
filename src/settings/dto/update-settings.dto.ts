import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export class BusinessHourDayDto {
  @IsIn(DAYS)
  day!: (typeof DAYS)[number];

  @IsString()
  @IsNotEmpty()
  label!: string;

  /** 24h "HH:mm" — ignored when closed is true */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'open must be HH:mm (24h)',
  })
  open?: string;

  /** 24h "HH:mm" — ignored when closed is true */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'close must be HH:mm (24h)',
  })
  close?: string;

  @IsBoolean()
  closed!: boolean;
}

export class BusinessHoursDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsArray()
  @ArrayMinSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDayDto)
  week!: BusinessHourDayDto[];
}

export class SocialLinksDto {
  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  restaurantName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  businessHours?: BusinessHoursDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}
