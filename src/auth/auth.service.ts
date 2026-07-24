import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
    const customer = await this.prisma.customer.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'customer',
      },
    });

    return {
      accessToken: await this.signToken(customer.id, customer.email, 'customer'),
      customer: this.toCustomerResponse(customer),
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
  }) {
    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      role: 'customer' as const,
    };
  }
}
