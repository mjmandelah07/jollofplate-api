import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SourcingRequestStatus,
} from '../generated/prisma/client';
import { slugify } from '../common/utils/slugify';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSourcingItemDto,
  CreateSourcingRequestDto,
  QuerySourcingItemsDto,
  QuerySourcingRequestsDto,
  ReorderSourcingItemsDto,
  UpdateSourcingItemDto,
} from './dto/sourcing.dto';

@Injectable()
export class SourcingService {
  constructor(private readonly prisma: PrismaService) {}

  // ——— Catalog (public + admin) ———

  async findItemsPublic(query: QuerySourcingItemsDto = {}) {
    return this.listItems(query, { publicOnly: true });
  }

  async findItemsAdmin(query: QuerySourcingItemsDto = {}) {
    return this.listItems(query);
  }

  findItemsAdminUnpaged() {
    return this.prisma.sourcingItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findItemAdmin(id: string) {
    const item = await this.prisma.sourcingItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Sourcing item not found');
    }
    return item;
  }

  async createItem(dto: CreateSourcingItemDto) {
    const max = await this.prisma.sourcingItem.aggregate({
      _max: { sortOrder: true },
    });
    const slug = await this.ensureUniqueSlug(slugify(dto.name));

    try {
      return await this.prisma.sourcingItem.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() ?? '',
          image: dto.image?.trim() || null,
          unitHint: dto.unitHint?.trim() || null,
          available: dto.available ?? true,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Sourcing item slug already exists');
      }
      throw error;
    }
  }

  async updateItem(id: string, dto: UpdateSourcingItemDto) {
    await this.findItemAdmin(id);
    const data: Prisma.SourcingItemUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      data.slug = await this.ensureUniqueSlug(slugify(dto.name), id);
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim();
    }
    if (dto.image !== undefined) {
      data.image = dto.image.trim() || null;
    }
    if (dto.unitHint !== undefined) {
      data.unitHint = dto.unitHint.trim() || null;
    }
    if (dto.available !== undefined) {
      data.available = dto.available;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    return this.prisma.sourcingItem.update({ where: { id }, data });
  }

  async removeItem(id: string) {
    await this.findItemAdmin(id);
    await this.prisma.sourcingItem.delete({ where: { id } });
    return { deleted: true };
  }

  async reorderItems(dto: ReorderSourcingItemsDto) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.sourcingItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.findItemsAdminUnpaged();
  }

  // ——— Customer requests ———

  async createRequest(customerId: string, dto: CreateSourcingRequestDto) {
    const catalogIds = dto.items
      .map((item) => item.sourcingItemId)
      .filter((id): id is string => Boolean(id));

    const catalog = catalogIds.length
      ? await this.prisma.sourcingItem.findMany({
          where: { id: { in: catalogIds }, available: true },
        })
      : [];
    const catalogMap = new Map(catalog.map((item) => [item.id, item]));

    const lineItems: {
      sourcingItemId: string | null;
      name: string;
      quantity: number | null;
      notes: string | null;
    }[] = [];

    for (const item of dto.items) {
      if (item.sourcingItemId) {
        const catalogItem = catalogMap.get(item.sourcingItemId);
        if (!catalogItem) {
          throw new BadRequestException(
            `Sourcing item not available: ${item.sourcingItemId}`,
          );
        }
        lineItems.push({
          sourcingItemId: catalogItem.id,
          name: catalogItem.name,
          quantity: item.quantity ?? null,
          notes: item.notes?.trim() || null,
        });
        continue;
      }

      const customName = item.name?.trim();
      if (!customName) {
        throw new BadRequestException(
          'Each item needs a sourcingItemId or a custom name',
        );
      }
      lineItems.push({
        sourcingItemId: null,
        name: customName,
        quantity: item.quantity ?? null,
        notes: item.notes?.trim() || null,
      });
    }

    const settings = await this.prisma.restaurantSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    const requestNumber = await this.generateRequestNumber();

    const request = await this.prisma.sourcingRequest.create({
      data: {
        requestNumber,
        customerId,
        status: SourcingRequestStatus.PENDING,
        deliveryLine1: dto.deliveryAddress.line1.trim(),
        deliveryLine2: dto.deliveryAddress.line2?.trim() || null,
        deliveryCity: dto.deliveryAddress.city.trim(),
        deliveryState: dto.deliveryAddress.state?.trim() || null,
        deliveryLandmark: dto.deliveryAddress.landmark?.trim() || null,
        deliveryPhone: dto.deliveryAddress.phone?.trim() || null,
        notes: dto.notes?.trim() || null,
        items: { create: lineItems },
      },
      include: this.requestInclude(),
    });

    return this.withWhatsAppHint(request, settings?.whatsappNumber);
  }

  async findMyRequests(customerId: string, query: QuerySourcingRequestsDto = {}) {
    return this.listRequests(query, { customerId });
  }

  async findMyRequest(customerId: string, id: string) {
    const request = await this.prisma.sourcingRequest.findFirst({
      where: { id, customerId },
      include: this.requestInclude(),
    });
    if (!request) {
      throw new NotFoundException('Sourcing request not found');
    }
    return request;
  }

  async cancelMyRequest(customerId: string, id: string) {
    const request = await this.findMyRequest(customerId, id);
    if (request.status !== SourcingRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    return this.prisma.sourcingRequest.update({
      where: { id },
      data: { status: SourcingRequestStatus.CANCELLED },
      include: this.requestInclude(),
    });
  }

  // ——— Admin requests ———

  async findAllRequestsAdmin(query: QuerySourcingRequestsDto = {}) {
    return this.listRequests(query);
  }

  async findOneRequestAdmin(id: string) {
    const request = await this.prisma.sourcingRequest.findUnique({
      where: { id },
      include: {
        ...this.requestInclude(),
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
    if (!request) {
      throw new NotFoundException('Sourcing request not found');
    }
    return request;
  }

  async updateRequestStatus(id: string, status: SourcingRequestStatus) {
    await this.findOneRequestAdmin(id);
    return this.prisma.sourcingRequest.update({
      where: { id },
      data: { status },
      include: {
        ...this.requestInclude(),
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

  // ——— helpers ———

  private async listItems(
    query: QuerySourcingItemsDto,
    options?: { publicOnly?: boolean },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: Prisma.SourcingItemWhereInput = {};

    if (options?.publicOnly) {
      where.available = true;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.sourcingItem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sourcingItem.count({ where }),
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

  private async listRequests(
    query: QuerySourcingRequestsDto,
    options?: { customerId?: string },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SourcingRequestWhereInput = {};

    if (options?.customerId) {
      where.customerId = options.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      const searchOr: Prisma.SourcingRequestWhereInput[] = [
        { requestNumber: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { deliveryLine1: { contains: term, mode: 'insensitive' } },
        { deliveryCity: { contains: term, mode: 'insensitive' } },
        {
          items: {
            some: { name: { contains: term, mode: 'insensitive' } },
          },
        },
      ];

      if (!options?.customerId) {
        searchOr.push(
          { customer: { email: { contains: term, mode: 'insensitive' } } },
          { customer: { firstName: { contains: term, mode: 'insensitive' } } },
          { customer: { lastName: { contains: term, mode: 'insensitive' } } },
          { customer: { phone: { contains: term, mode: 'insensitive' } } },
        );
      }

      where.OR = searchOr;
    }

    const include = options?.customerId
      ? this.requestInclude()
      : {
          ...this.requestInclude(),
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        };

    const [items, total] = await Promise.all([
      this.prisma.sourcingRequest.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sourcingRequest.count({ where }),
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

  private requestInclude() {
    return {
      items: {
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private async ensureUniqueSlug(base: string, excludeId?: string) {
    const root = slugify(base) || 'item';
    let slug = root;
    let n = 2;
    while (true) {
      const existing = await this.prisma.sourcingItem.findUnique({
        where: { slug },
      });
      if (!existing || existing.id === excludeId) {
        return slug;
      }
      slug = `${root}-${n}`;
      n += 1;
    }
  }

  private async generateRequestNumber() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = Math.floor(100000 + Math.random() * 900000);
      const requestNumber = `JS-${suffix}`;
      const existing = await this.prisma.sourcingRequest.findUnique({
        where: { requestNumber },
      });
      if (!existing) {
        return requestNumber;
      }
    }
    return `JS-${Date.now()}`;
  }

  private withWhatsAppHint<
    T extends {
      requestNumber: string;
      notes: string | null;
      deliveryLine1: string;
      deliveryLine2: string | null;
      deliveryCity: string;
      deliveryState: string | null;
      deliveryLandmark: string | null;
      deliveryPhone: string | null;
      items: { name: string; quantity: number | null; notes: string | null }[];
    },
  >(request: T, whatsappNumber?: string | null) {
    const addressParts = [
      request.deliveryLine1,
      request.deliveryLine2,
      request.deliveryCity,
      request.deliveryState,
      request.deliveryLandmark ? `Landmark: ${request.deliveryLandmark}` : null,
      request.deliveryPhone ? `Phone: ${request.deliveryPhone}` : null,
    ].filter(Boolean);

    const itemLines = request.items.map((item) => {
      const qty = item.quantity != null ? ` x${item.quantity}` : '';
      const note = item.notes ? ` (${item.notes})` : '';
      return `- ${item.name}${qty}${note}`;
    });

    const text = [
      `Hello JollofPlate! Custom shopping request ${request.requestNumber}.`,
      `Please quote prices — I need these sourced (aim ~24 hours):`,
      ...itemLines,
      request.notes ? `Notes: ${request.notes}` : null,
      `Deliver to: ${addressParts.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      ...request,
      checkout: {
        whatsappNumber: whatsappNumber ?? null,
        suggestedMessage: text,
      },
    };
  }
}
