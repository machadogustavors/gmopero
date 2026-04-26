import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemType, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';

const Decimal = Prisma.Decimal;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getStock(
    companyId: string,
    search?: string,
    lowOnly = false,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      companyId,
      type: ItemType.PART,
    };

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (lowOnly) {
      const allProducts = await this.prisma.product.findMany({
        where,
        orderBy: { description: 'asc' },
      });

      const lowStockProducts = allProducts.filter((product) =>
        new Decimal(product.currentStock).lessThanOrEqualTo(product.reorderLevel),
      );

      const data = lowStockProducts.slice(skip, skip + limit);
      const total = lowStockProducts.length;

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { description: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMovements(
    companyId: string,
    type?: StockMovementType,
    productId?: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      companyId,
      ...(type ? { type } : {}),
      ...(productId ? { productId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              description: true,
            },
          },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createAdjustment(
    companyId: string,
    userId: string,
    dto: CreateStockAdjustmentDto,
  ) {
    if (
      dto.type !== StockMovementType.ADJUSTMENT_IN &&
      dto.type !== StockMovementType.ADJUSTMENT_OUT
    ) {
      throw new BadRequestException('Adjustment type must be ADJUSTMENT_IN or ADJUSTMENT_OUT');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        companyId,
      },
      select: {
        id: true,
        description: true,
        currentStock: true,
        unitCost: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const quantity = new Decimal(dto.quantity);

    if (
      dto.type === StockMovementType.ADJUSTMENT_OUT &&
      new Decimal(product.currentStock).lessThan(quantity)
    ) {
      throw new BadRequestException(`Insufficient stock for \"${product.description}\"`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          currentStock:
            dto.type === StockMovementType.ADJUSTMENT_IN
              ? { increment: quantity }
              : { decrement: quantity },
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          productId: product.id,
          type: dto.type,
          quantity,
          unitCost: product.unitCost,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: userId,
          notes: dto.notes,
        },
      });

      return {
        product: updatedProduct,
        movement,
      };
    });
  }

  async getReplenishmentSuggestions(companyId: string, days = 30, limit = 20) {
    const safeDays = Math.max(1, days);
    const since = new Date();
    since.setDate(since.getDate() - safeDays);

    const [products, consumptionByProduct] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          companyId,
          type: ItemType.PART,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          description: true,
          currentStock: true,
          reorderLevel: true,
          unitCost: true,
          updatedAt: true,
        },
      }),
      this.prisma.stockMovement.groupBy({
        by: ['productId'],
        where: {
          companyId,
          type: StockMovementType.SERVICE_OUT,
          createdAt: {
            gte: since,
          },
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const consumedMap = new Map(
      consumptionByProduct.map((item) => [item.productId, Number(item._sum.quantity ?? 0)]),
    );

    const suggestions = products
      .map((product) => {
        const currentStock = Number(product.currentStock);
        const reorderLevel = Number(product.reorderLevel);
        const consumedInPeriod = consumedMap.get(product.id) ?? 0;
        const avgDailyConsumption = consumedInPeriod / safeDays;
        const recommendedCoverageDays = 30;
        const targetStock = Math.max(reorderLevel, avgDailyConsumption * recommendedCoverageDays);
        const suggestedQuantity = Math.max(0, targetStock - currentStock);

        const daysOfCoverage = avgDailyConsumption > 0
          ? currentStock / avgDailyConsumption
          : null;

        return {
          productId: product.id,
          code: product.code,
          description: product.description,
          currentStock,
          reorderLevel,
          consumedInPeriod,
          avgDailyConsumption,
          daysOfCoverage,
          suggestedQuantity,
          estimatedCost: suggestedQuantity * Number(product.unitCost),
          urgency: currentStock <= reorderLevel ? 'HIGH' : suggestedQuantity > 0 ? 'MEDIUM' : 'LOW',
        };
      })
      .filter((item) => item.suggestedQuantity > 0 || item.urgency === 'HIGH')
      .sort((a, b) => {
        if (a.urgency === 'HIGH' && b.urgency !== 'HIGH') return -1;
        if (b.urgency === 'HIGH' && a.urgency !== 'HIGH') return 1;
        return b.suggestedQuantity - a.suggestedQuantity;
      })
      .slice(0, limit);

    return {
      data: suggestions,
      meta: {
        daysAnalyzed: safeDays,
        generatedAt: new Date().toISOString(),
        count: suggestions.length,
      },
      summary: {
        totalEstimatedCost: suggestions.reduce((sum, item) => sum + item.estimatedCost, 0),
        highUrgencyCount: suggestions.filter((item) => item.urgency === 'HIGH').length,
      },
    };
  }
}
