import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCategoriesDto {
  @IsOptional()
  @IsString()
  search?: string;

  /** Admin only — ignored on public list (always ACTIVE) */
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'] as const)
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
