import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async loginAdmin(dto: LoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: await this.signToken(admin.id, admin.email, 'admin'),
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: 'admin',
      },
    };
  }

  async registerCustomer(dto: RegisterCustomerDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { token, expires } = this.createVerifyToken();

    const customer = await this.prisma.customer.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'customer',
        emailVerifyToken: token,
        emailVerifyExpires: expires,
      },
    });

    await this.sendVerificationEmailSafe(customer);

    return {
      accessToken: await this.signToken(customer.id, customer.email, 'customer'),
      customer: this.toCustomerResponse(customer),
      message: 'Registered. Check your email to verify your account.',
    };
  }

  async loginCustomer(dto: LoginDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: await this.signToken(
        customer.id,
        customer.email,
        'customer',
      ),
      customer: this.toCustomerResponse(customer),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { emailVerifyToken: dto.token },
    });

    if (!customer) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    if (
      !customer.emailVerifyExpires ||
      customer.emailVerifyExpires.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Verification link expired. Request a new one.',
      );
    }

    if (customer.emailVerifiedAt) {
      return {
        message: 'Email already verified',
        customer: this.toCustomerResponse(customer),
      };
    }

    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    return {
      message: 'Email verified successfully',
      customer: this.toCustomerResponse(updated),
    };
  }

  async resendVerification(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new UnauthorizedException();
    }

    if (customer.emailVerifiedAt) {
      return {
        message: 'Email already verified',
        customer: this.toCustomerResponse(customer),
      };
    }

    const { token, expires } = this.createVerifyToken();
    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerifyToken: token,
        emailVerifyExpires: expires,
      },
    });

    await this.sendVerificationEmailSafe(updated);

    return {
      message: 'Verification email sent',
      customer: this.toCustomerResponse(updated),
    };
  }

  private createVerifyToken() {
    return {
      token: randomBytes(32).toString('hex'),
      expires: new Date(Date.now() + VERIFY_TTL_MS),
    };
  }

  private async sendVerificationEmailSafe(customer: {
    email: string;
    firstName: string;
    emailVerifyToken: string | null;
  }) {
    if (!customer.emailVerifyToken) {
      return;
    }

    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    const verifyUrl = `${frontendUrl}/verify-email?token=${customer.emailVerifyToken}`;

    try {
      await this.mail.sendEmailVerification({
        to: customer.email,
        firstName: customer.firstName,
        verifyUrl,
      });
    } catch (error) {
      this.logger.error(
        `Could not send verification email to ${customer.email}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't fail registration if mail fails — user can resend.
    }
  }

  private signToken(sub: string, email: string, role: 'admin' | 'customer') {
    return this.jwtService.signAsync({ sub, email, role });
  }

  private toCustomerResponse(customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    emailVerifiedAt?: Date | null;
  }) {
    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      role: 'customer' as const,
      emailVerified: Boolean(customer.emailVerifiedAt),
    };
  }
}
