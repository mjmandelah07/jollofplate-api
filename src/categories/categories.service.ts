import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findPublic() {
    return this.prisma.category.findMany({
      where: { status: CategoryStatus.ACTIVE },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findAllAdmin() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { meals: true } } },
    });
  }

  async findOneAdmin(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = await this.ensureUniqueSlug(slugify(dto.name));
    const sortOrder = await this.getNextSortOrder();

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug,
          image: dto.image,
          description: dto.description,
          status: (dto.status as CategoryStatus | undefined) ?? CategoryStatus.ACTIVE,
          sortOrder,
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOneAdmin(id);

    const data: Prisma.CategoryUpdateInput = {
      name: dto.name,
      image: dto.image,
      description: dto.description,
      status: dto.status as CategoryStatus | undefined,
    };

    Object.keys(data).forEach((key) => {
      if (data[key as keyof typeof data] === undefined) {
        delete data[key as keyof typeof data];
      }
    });

    try {
      return await this.prisma.category.update({ where: { id }, data });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    const mealCount = await this.prisma.meal.count({ where: { categoryId: id } });
    if (mealCount > 0) {
      throw new ConflictException(
        'Cannot delete category with meals. Move or delete meals first.',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  async reorder(dto: ReorderCategoriesDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return this.findAllAdmin();
  }

  private async getNextSortOrder() {
    const lastCategory = await this.prisma.category.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return (lastCategory?.sortOrder ?? -1) + 1;
  }

  private async ensureUniqueSlug(base: string, excludeId?: string) {
    const slug = slugify(base) || 'category';
    let suffix = 0;

    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      const existing = await this.prisma.category.findUnique({
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
      throw new ConflictException('Category slug already exists');
    }
    throw error;
  }
}
