import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { QueryAddressesDto } from './dto/query-addresses.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(customerId: string, query: QueryAddressesDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CustomerAddressWhereInput = { customerId };

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { label: { contains: term, mode: 'insensitive' } },
        { line1: { contains: term, mode: 'insensitive' } },
        { line2: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { state: { contains: term, mode: 'insensitive' } },
        { landmark: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customerAddress.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerAddress.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(customerId: string, id: string) {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id },
    });
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async create(customerId: string, dto: CreateAddressDto) {
    const count = await this.prisma.customerAddress.count({
      where: { customerId },
    });
    // First address is always the default.
    const makeDefault = dto.isDefault === true || count === 0;

    return this.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          customerId,
          label: dto.label?.trim() || null,
          line1: dto.line1.trim(),
          line2: dto.line2?.trim() || null,
          city: dto.city.trim(),
          state: dto.state?.trim() || null,
          landmark: dto.landmark?.trim() || null,
          phone: dto.phone?.trim() || null,
          isDefault: makeDefault,
        },
      });
    });
  }

  async update(customerId: string, id: string, dto: UpdateAddressDto) {
    await this.findOne(customerId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id },
        data: {
          label: dto.label?.trim(),
          line1: dto.line1?.trim(),
          line2: dto.line2?.trim(),
          city: dto.city?.trim(),
          state: dto.state?.trim(),
          landmark: dto.landmark?.trim(),
          phone: dto.phone?.trim(),
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async setDefault(customerId: string, id: string) {
    await this.findOne(customerId, id);

    return this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      return tx.customerAddress.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  async remove(customerId: string, id: string) {
    const address = await this.findOne(customerId, id);
    await this.prisma.customerAddress.delete({ where: { id } });

    // If we removed the default, promote the most recent remaining address.
    if (address.isDefault) {
      const next = await this.prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { updatedAt: 'desc' },
      });
      if (next) {
        await this.prisma.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Address deleted' };
  }
}
