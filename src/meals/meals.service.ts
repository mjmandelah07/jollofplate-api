import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { QueryMealsDto } from './dto/query-meals.dto';

@Injectable()
export class MealsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: QueryMealsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = await this.buildPublicWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.meal.count({ where }),
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

  findFeatured() {
    return this.prisma.meal.findMany({
      where: { available: true, featured: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findBestSellers() {
    return this.prisma.meal.findMany({
      where: { available: true, bestSeller: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const meal = await this.prisma.meal.findFirst({
      where: { slug, available: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!meal) {
      throw new NotFoundException('Meal not found');
    }
    return meal;
  }

  findAllAdmin() {
    return this.prisma.meal.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOneAdmin(id: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!meal) {
      throw new NotFoundException('Meal not found');
    }
    return meal;
  }

  async create(dto: CreateMealDto) {
    await this.ensureCategory(dto.categoryId);
    const slug = await this.ensureUniqueSlug(dto.slug || slugify(dto.name));

    try {
      return await this.prisma.meal.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description ?? '',
          price: dto.price,
          discountPrice: dto.discountPrice ?? null,
          categoryId: dto.categoryId,
          images: dto.images ?? [],
          preparationTime: dto.preparationTime,
          featured: dto.featured ?? false,
          bestSeller: dto.bestSeller ?? false,
          available: dto.available ?? true,
          ingredients: dto.ingredients,
          extras: dto.extras as Prisma.InputJsonValue | undefined,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async update(id: string, dto: UpdateMealDto) {
    await this.findOneAdmin(id);
    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }

    const data: Prisma.MealUpdateInput = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      discountPrice: dto.discountPrice,
      images: dto.images,
      preparationTime: dto.preparationTime,
      featured: dto.featured,
      bestSeller: dto.bestSeller,
      available: dto.available,
      ingredients: dto.ingredients,
      extras:
        dto.extras === undefined
          ? undefined
          : (dto.extras as Prisma.InputJsonValue),
    };

    if (dto.categoryId) {
      data.category = { connect: { id: dto.categoryId } };
    }

    if (dto.slug) {
      data.slug = await this.ensureUniqueSlug(dto.slug, id);
    } else if (dto.name) {
      data.slug = await this.ensureUniqueSlug(slugify(dto.name), id);
    }

    // Strip undefined so Prisma doesn't overwrite with undefined
    Object.keys(data).forEach((key) => {
      if (data[key as keyof typeof data] === undefined) {
        delete data[key as keyof typeof data];
      }
    });

    try {
      return await this.prisma.meal.update({
        where: { id },
        data,
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.meal.delete({ where: { id } });
  }

  private async buildPublicWhere(
    query: QueryMealsDto,
  ): Promise<Prisma.MealWhereInput> {
    const where: Prisma.MealWhereInput = { available: true };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.category) {
      const category = await this.prisma.category.findFirst({
        where: {
          OR: [{ slug: query.category }, { id: query.category }],
        },
      });
      where.categoryId = category?.id ?? '__none__';
    }

    return where;
  }

  private async ensureCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async ensureUniqueSlug(base: string, excludeId?: string) {
    let slug = slugify(base) || 'meal';
    let suffix = 0;

    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      const existing = await this.prisma.meal.findUnique({
        where: { slug: candidate },
      });
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      suffix += 1;
    }
  }

  private handleUniqueError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Meal slug already exists');
    }
    throw error;
  }
}
