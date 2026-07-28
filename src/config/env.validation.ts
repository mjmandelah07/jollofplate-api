import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  /** Gmail / SMTP — use a Google App Password, not your normal Gmail password */
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsString()
  SMTP_PORT?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  /** e.g. "JollofPlate <jollofplate@gmail.com>" — must match SMTP_USER for Gmail */
  @IsOptional()
  @IsString()
  MAIL_FROM?: string;

  /**
   * Comma-separated public URLs to ping every 5 minutes (API + web).
   * Example: https://api.onrender.com,https://web.onrender.com
   */
  @IsOptional()
  @IsString()
  KEEP_ALIVE_URLS?: string;

  /** Alias for KEEP_ALIVE_URLS (single or comma-separated). */
  @IsOptional()
  @IsString()
  KEEP_ALIVE_URL?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT?: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Config validation error: ${messages}`);
  }

  return validated;
}
