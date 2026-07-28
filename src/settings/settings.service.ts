import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const DEFAULT_SETTINGS = {
  restaurantName: 'JollofPlate',
  whatsappNumber: '2348000000000',
  deliveryFee: 0,
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.restaurantSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.restaurantSettings.create({ data: DEFAULT_SETTINGS });
  }

  async update(dto: UpdateSettingsDto) {
    const current = await this.get();

    return this.prisma.restaurantSettings.update({
      where: { id: current.id },
      data: {
        restaurantName: dto.restaurantName,
        whatsappNumber: dto.whatsappNumber,
        contactNumber: dto.contactNumber,
        email: dto.email,
        address: dto.address,
        businessHours:
          dto.businessHours === undefined
            ? undefined
            : (dto.businessHours as unknown as Prisma.InputJsonValue),
        deliveryFee: dto.deliveryFee,
        socialLinks:
          dto.socialLinks === undefined
            ? undefined
            : (dto.socialLinks as unknown as Prisma.InputJsonValue),
        pickupLine1: dto.pickupLine1,
        pickupLine2: dto.pickupLine2,
        pickupCity: dto.pickupCity,
        pickupState: dto.pickupState,
        pickupZip: dto.pickupZip,
        pickupCountry: dto.pickupCountry,
        pickupPhone: dto.pickupPhone,
        pickupEmail: dto.pickupEmail,
        pickupFirstName: dto.pickupFirstName,
        pickupLastName: dto.pickupLastName,
      },
    });
  }
}
