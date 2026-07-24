import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

type AuthUser = { id: string; role: string };

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createForCustomer(customerId: string, dto: CreateOrderDto) {
    const settings = await this.prisma.restaurantSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    const deliveryFee = settings?.deliveryFee ?? 0;

    const mealIds = dto.items.map((item) => item.mealId);
    const meals = await this.prisma.meal.findMany({
      where: { id: { in: mealIds }, available: true },
    });
    const mealMap = new Map(meals.map((meal) => [meal.id, meal]));

    const lineItems: {
      mealId: string;
      name: string;
      unitPrice: number;
      quantity: number;
      extras: Prisma.InputJsonValue | undefined;
      lineTotal: number;
    }[] = [];

    for (const item of dto.items) {
      const meal = mealMap.get(item.mealId);
      if (!meal) {
        throw new BadRequestException(
          `Meal not available: ${item.mealId}`,
        );
      }

      const unitPrice = meal.discountPrice ?? meal.price;
      const extrasTotal = this.sumExtras(item.extras);
      const lineTotal = (unitPrice + extrasTotal) * item.quantity;

      lineItems.push({
        mealId: meal.id,
        name: meal.name,
        unitPrice,
        quantity: item.quantity,
        extras:
          item.extras === undefined
            ? undefined
            : (item.extras as Prisma.InputJsonValue),
        lineTotal,
      });
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = subtotal + deliveryFee;
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerId,
        status: OrderStatus.PENDING,
        subtotal,
        deliveryFee,
        total,
        notes: dto.notes,
        items: {
          create: lineItems,
        },
      },
      include: this.orderInclude(),
    });

    return this.withWhatsAppHint(order, settings?.whatsappNumber);
  }

  findMine(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: this.orderInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForCustomer(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude(),
    });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  findAllAdmin(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        ...this.orderInclude(),
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        ...this.orderInclude(),
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatus(orderId: string, status: 'PAID' | 'CANCELLED') {
    const order = await this.findOneAdmin(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Only pending orders can change status',
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status:
          status === 'PAID' ? OrderStatus.PAID : OrderStatus.CANCELLED,
        paidAt: status === 'PAID' ? new Date() : null,
      },
      include: {
        ...this.orderInclude(),
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }

  async removeItem(user: AuthUser, orderId: string, itemId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user.role === 'customer' && order.customerId !== user.id) {
      throw new ForbiddenException('Not your order');
    }

    if (user.role !== 'admin' && user.role !== 'customer') {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Items can only be removed from pending orders',
      );
    }

    const item = order.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw new NotFoundException('Order item not found');
    }

    if (order.items.length === 1) {
      await this.prisma.order.delete({ where: { id: orderId } });
      return {
        deleted: true,
        message: 'Last item removed; pending order deleted',
      };
    }

    await this.prisma.orderItem.delete({ where: { id: itemId } });

    const remaining = order.items.filter((entry) => entry.id !== itemId);
    const subtotal = remaining.reduce((sum, entry) => sum + entry.lineTotal, 0);
    const total = subtotal + order.deliveryFee;

    return this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal, total },
      include:
        user.role === 'admin'
          ? {
              ...this.orderInclude(),
              customer: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            }
          : this.orderInclude(),
    });
  }

  private orderInclude() {
    return {
      items: {
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private sumExtras(extras: unknown): number {
    if (!Array.isArray(extras)) {
      return 0;
    }
    return extras.reduce((sum: number, extra) => {
      if (
        extra &&
        typeof extra === 'object' &&
        'price' in extra &&
        typeof (extra as { price: unknown }).price === 'number'
      ) {
        return sum + (extra as { price: number }).price;
      }
      return sum;
    }, 0);
  }

  private async generateOrderNumber() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = Math.floor(100000 + Math.random() * 900000);
      const orderNumber = `JP-${suffix}`;
      const existing = await this.prisma.order.findUnique({
        where: { orderNumber },
      });
      if (!existing) {
        return orderNumber;
      }
    }
    return `JP-${Date.now()}`;
  }

  private withWhatsAppHint<T extends { orderNumber: string; total: number }>(
    order: T,
    whatsappNumber?: string | null,
  ) {
    const text = `Hello JollofPlate! I want to pay for order ${order.orderNumber} (Total: ₦${order.total}).`;
    return {
      ...order,
      checkout: {
        whatsappNumber: whatsappNumber ?? null,
        suggestedMessage: text,
      },
    };
  }
}
