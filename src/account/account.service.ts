import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new UnauthorizedException();
    }
    return this.toProfile(customer);
  }

  async updateProfile(customerId: string, dto: UpdateProfileDto) {
    await this.getProfile(customerId);

    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName:
          dto.firstName === undefined ? undefined : dto.firstName.trim(),
        lastName: dto.lastName === undefined ? undefined : dto.lastName.trim(),
        phone:
          dto.phone === undefined ? undefined : dto.phone.trim() || null,
      },
    });

    return {
      message: 'Profile updated',
      customer: this.toProfile(customer),
    };
  }

  async changePassword(customerId: string, dto: ChangePasswordDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new UnauthorizedException();
    }

    const currentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      customer.passwordHash,
    );
    if (!currentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });

    return { message: 'Password updated successfully' };
  }

  private toProfile(customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      role: 'customer' as const,
      emailVerified: Boolean(customer.emailVerifiedAt),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
