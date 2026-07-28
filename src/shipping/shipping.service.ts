import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TerminalService } from '../terminal/terminal.service';
import { GetShippingRatesDto } from './dto/get-shipping-rates.dto';

type RateRow = Record<string, unknown>;

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly terminal: TerminalService,
  ) {}

  async getRatesForCustomer(customerId: string, dto: GetShippingRatesDto) {
    if (!this.terminal.isConfigured()) {
      throw new ServiceUnavailableException(
        'Live shipping rates are not configured yet',
      );
    }

    const [customer, settings, meals] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId } }),
      this.prisma.restaurantSettings.findFirst({
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.meal.findMany({
        where: {
          id: { in: dto.items.map((item) => item.mealId) },
          available: true,
        },
      }),
    ]);

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
    if (!settings) {
      throw new BadRequestException('Restaurant settings missing');
    }

    const pickup = this.buildPickupAddress(settings);
    const mealMap = new Map(meals.map((meal) => [meal.id, meal]));
    const parcelItems: {
      description: string;
      name: string;
      value: number;
      quantity: number;
      weight: number;
    }[] = [];

    for (const item of dto.items) {
      const meal = mealMap.get(item.mealId);
      if (!meal) {
        throw new BadRequestException(`Meal not available: ${item.mealId}`);
      }
      const unitPrice = meal.discountPrice ?? meal.price;
      parcelItems.push({
        description: meal.name,
        name: meal.name,
        value: unitPrice,
        quantity: item.quantity,
        weight: Math.max(0.5, 0.4 * item.quantity),
      });
    }

    const phone =
      dto.deliveryAddress.phone?.trim() ||
      customer.phone?.trim() ||
      settings.pickupPhone ||
      settings.contactNumber;
    if (!phone) {
      throw new BadRequestException(
        'Delivery phone is required for shipping rates',
      );
    }

    const quotes = await this.terminal.getShipmentQuotes({
      pickup,
      delivery: {
        city: dto.deliveryAddress.city,
        state: dto.deliveryAddress.state,
        country: dto.deliveryAddress.country ?? 'NG',
        zip: dto.deliveryAddress.zip ?? '100001',
        line1: dto.deliveryAddress.line1,
        line2:
          dto.deliveryAddress.line2 ||
          dto.deliveryAddress.landmark ||
          'N/A',
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone,
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        is_residential: true,
      },
      items: parcelItems,
    });

    const rawRates = Array.isArray(quotes.data) ? (quotes.data as RateRow[]) : [];
    const rates = rawRates
      .map((rate) => this.mapRate(rate))
      .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate))
      .sort((a, b) => a.amount - b.amount);

    return {
      currency: 'NGN',
      mode: this.terminal.isTestMode() ? 'test' : 'live',
      fallbackDeliveryFee: settings.deliveryFee,
      rates,
    };
  }

  async resolveRateForCheckout(rateId: string) {
    const response = await this.terminal.getRate(rateId);
    const rate =
      response.data && typeof response.data === 'object'
        ? (response.data as RateRow)
        : (response as RateRow);
    const mapped = this.mapRate(rate);
    if (!mapped) {
      throw new BadRequestException('Invalid or expired shipping rate');
    }
    return mapped;
  }

  async bookShipmentForOrder(order: {
    orderNumber: string;
    terminalRateId: string | null;
    terminalPickupAddressId: string | null;
    terminalDeliveryAddressId: string | null;
    terminalParcelId: string | null;
    terminalShipmentId: string | null;
  }) {
    if (!this.terminal.isConfigured()) {
      throw new ServiceUnavailableException(
        'Terminal Africa is not configured',
      );
    }
    if (order.terminalShipmentId) {
      throw new BadRequestException('Shipment already booked for this order');
    }
    if (
      !order.terminalRateId ||
      !order.terminalPickupAddressId ||
      !order.terminalDeliveryAddressId ||
      !order.terminalParcelId
    ) {
      throw new BadRequestException(
        'Order has no Terminal rate selected — customer must choose a rate at checkout',
      );
    }

    const created = await this.terminal.createShipment({
      pickupAddressId: order.terminalPickupAddressId,
      deliveryAddressId: order.terminalDeliveryAddressId,
      parcelId: order.terminalParcelId,
      metadata: { orderNumber: order.orderNumber },
    });

    const data =
      created.data && typeof created.data === 'object'
        ? (created.data as RateRow)
        : {};
    const shipmentId =
      (typeof data.shipment_id === 'string' && data.shipment_id) ||
      (typeof data.id === 'string' && data.id) ||
      null;
    if (!shipmentId) {
      throw new ServiceUnavailableException(
        'Terminal did not return a shipment id',
      );
    }

    const arranged = await this.terminal.arrangePickup({
      shipmentId,
      rateId: order.terminalRateId,
    });

    return { shipmentId, arranged };
  }

  buildPickupAddress(settings: {
    restaurantName: string;
    email: string | null;
    contactNumber: string | null;
    whatsappNumber: string;
    pickupLine1: string | null;
    pickupLine2: string | null;
    pickupCity: string | null;
    pickupState: string | null;
    pickupZip: string | null;
    pickupCountry: string | null;
    pickupPhone: string | null;
    pickupEmail: string | null;
    pickupFirstName: string | null;
    pickupLastName: string | null;
  }) {
    if (
      !settings.pickupLine1?.trim() ||
      !settings.pickupCity?.trim() ||
      !settings.pickupState?.trim()
    ) {
      throw new BadRequestException(
        'Set kitchen pickup address in admin settings (pickupLine1, pickupCity, pickupState) before using live rates',
      );
    }

    const phone =
      settings.pickupPhone?.trim() ||
      settings.contactNumber?.trim() ||
      settings.whatsappNumber;
    if (!phone) {
      throw new BadRequestException('Pickup phone is required in settings');
    }

    return {
      city: settings.pickupCity,
      state: settings.pickupState,
      country: settings.pickupCountry || 'NG',
      zip: settings.pickupZip || '100001',
      line1: settings.pickupLine1,
      line2: settings.pickupLine2 || 'N/A',
      first_name: settings.pickupFirstName || 'JollofPlate',
      last_name: settings.pickupLastName || 'Kitchen',
      phone,
      email: settings.pickupEmail || settings.email || undefined,
      name: settings.restaurantName,
      is_residential: false,
    };
  }

  private mapRate(rate: RateRow) {
    const rateId =
      (typeof rate.rate_id === 'string' && rate.rate_id) ||
      (typeof rate.id === 'string' && rate.id) ||
      null;
    const amountRaw = rate.amount;
    const amount =
      typeof amountRaw === 'number'
        ? Math.round(amountRaw)
        : typeof amountRaw === 'string'
          ? Math.round(Number(amountRaw))
          : NaN;

    if (!rateId || !Number.isFinite(amount)) {
      return null;
    }

    return {
      rateId,
      amount,
      currency:
        typeof rate.currency === 'string' ? rate.currency : 'NGN',
      carrierName:
        typeof rate.carrier_name === 'string' ? rate.carrier_name : 'Carrier',
      carrierSlug:
        typeof rate.carrier_slug === 'string' ? rate.carrier_slug : null,
      carrierLogo:
        typeof rate.carrier_logo === 'string' ? rate.carrier_logo : null,
      deliveryTime:
        typeof rate.delivery_time === 'string' ? rate.delivery_time : null,
      pickupTime:
        typeof rate.pickup_time === 'string' ? rate.pickup_time : null,
      pickupAddressId:
        typeof rate.pickup_address === 'string' ? rate.pickup_address : null,
      deliveryAddressId:
        typeof rate.delivery_address === 'string'
          ? rate.delivery_address
          : null,
      parcelId: typeof rate.parcel === 'string' ? rate.parcel : null,
    };
  }
}
