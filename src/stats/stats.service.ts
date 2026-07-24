import { Injectable } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalMeals,
      totalCategories,
      availableMeals,
      unavailableMeals,
      featuredMeals,
      pendingOrders,
      paidOrders,
    ] = await Promise.all([
      this.prisma.meal.count(),
      this.prisma.category.count(),
      this.prisma.meal.count({ where: { available: true } }),
      this.prisma.meal.count({ where: { available: false } }),
      this.prisma.meal.count({ where: { featured: true } }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.PAID } }),
    ]);

    return {
      totalMeals,
      totalCategories,
      availableMeals,
      unavailableMeals,
      featuredMeals,
      pendingOrders,
      paidOrders,
    };
  }
}
