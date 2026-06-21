import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  ServiceOrderStatus,
  ItemType,
  StockMovementType,
} from '@prisma/client';
const Decimal = Prisma.Decimal;
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { AddItemDto } from './dto/add-item.dto';

@Injectable()
export class ServiceOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateServiceOrderDto) {
    // Get next order number for this company
    const lastOrder = await this.prisma.serviceOrder.findFirst({
      where: { companyId },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    return this.prisma.serviceOrder.create({
      data: {
        companyId,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        orderNumber,
        description: dto.description,
        status: ServiceOrderStatus.DRAFT,
      },
      include: {
        customer: { select: { id: true, name: true, taxId: true } },
        vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
        items: true,
      },
    });
  }

  async findAll(
    companyId: string,
    status?: ServiceOrderStatus,
    search?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
      ];

      const orderNum = parseInt(search, 10);
      if (!isNaN(orderNum)) {
        where.OR.push({ orderNumber: orderNum });
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceOrder.count({ where }),
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

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        vehicle: true,
        items: { orderBy: { createdAt: 'asc' } },

        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Service order not found');
    }

    return order;
  }

  async update(companyId: string, id: string, dto: UpdateServiceOrderDto) {
    const order = await this.findOne(companyId, id);

    if (order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.OPEN) {
      throw new BadRequestException('Can only update orders in DRAFT or OPEN status');
    }

    return this.prisma.serviceOrder.update({
      where: { id },
      data: dto,
      include: {
        customer: { select: { id: true, name: true } },
        vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
        items: true,
      },
    });
  }

  // ── Item Management ──────────────────────────────────

  async addItem(companyId: string, orderId: string, dto: AddItemDto) {
    const order = await this.findOne(companyId, orderId);

    if (order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.OPEN) {
      throw new BadRequestException('Can only add items to orders in DRAFT or OPEN status');
    }

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          companyId,
        },
        select: { id: true, type: true },
      });

      if (!product) {
        throw new BadRequestException('Product not found for this company');
      }

      if (product.type !== dto.type) {
        throw new BadRequestException('Item type must match product type');
      }
    }

    const totalPrice = dto.quantity * dto.unitPrice;

    const item = await this.prisma.serviceOrderItem.create({
      data: {
        companyId,
        serviceOrderId: orderId,
        productId: dto.productId,
        type: dto.type,
        description: dto.description,
        ncm: dto.ncm,
        cfop: dto.cfop,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        totalPrice,
      },
    });

    await this.recalculateTotals(orderId);

    return item;
  }

  async removeItem(companyId: string, orderId: string, itemId: string) {
    const order = await this.findOne(companyId, orderId);

    if (order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.OPEN) {
      throw new BadRequestException('Can only remove items from orders in DRAFT or OPEN status');
    }

    const item = await this.prisma.serviceOrderItem.findFirst({
      where: { id: itemId, serviceOrderId: orderId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    await this.prisma.serviceOrderItem.delete({ where: { id: itemId } });
    await this.recalculateTotals(orderId);

    return { deleted: true };
  }

  // ── Status Transitions ───────────────────────────────

  async open(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== ServiceOrderStatus.DRAFT) {
      throw new BadRequestException('Can only open orders in DRAFT status');
    }

    return this.prisma.serviceOrder.update({
      where: { id },
      data: { status: ServiceOrderStatus.OPEN },
      include: { items: true, customer: true, vehicle: true },
    });
  }

  async close(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== ServiceOrderStatus.OPEN) {
      throw new BadRequestException('Can only close orders in OPEN status');
    }

    if (order.items.length === 0) {
      throw new BadRequestException('Cannot close an order with no items');
    }

    const stockItems = order.items.filter(
      (item) =>
        item.type === ItemType.PART &&
        item.productId &&
        !item.stockMovedAt,
    );

    return this.prisma.$transaction(async (tx) => {
      for (const item of stockItems) {
        const product = await tx.product.findFirst({
          where: { id: item.productId!, companyId },
          select: { id: true, description: true, currentStock: true },
        });

        if (!product) {
          throw new BadRequestException(
            `Product linked to item "${item.description}" was not found`,
          );
        }

        if (new Decimal(product.currentStock).lessThan(item.quantity)) {
          throw new BadRequestException(
            `Insufficient stock for "${product.description}"`,
          );
        }

        await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: product.id,
            type: StockMovementType.SERVICE_OUT,
            quantity: item.quantity,
            referenceType: 'SERVICE_ORDER',
            referenceId: order.id,
            notes: `Baixa automática no fechamento da OS #${order.orderNumber}`,
          },
        });

        await tx.serviceOrderItem.update({
          where: { id: item.id },
          data: { stockMovedAt: new Date() },
        });
      }

      return tx.serviceOrder.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.CLOSED,
          closedAt: new Date(),
        },
        include: { items: true, customer: true, vehicle: true },
      });
    });
  }

  async updateInvoiceFlags(
    companyId: string,
    id: string,
    dto: { laborInvoiceIssued?: boolean; partsInvoiceIssued?: boolean },
  ) {
    const order = await this.findOne(companyId, id);

    if (order.status === ServiceOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot update invoice flags on a cancelled order');
    }

    const updateData: Prisma.ServiceOrderUpdateInput = {};

    if (dto.laborInvoiceIssued !== undefined) {
      updateData.laborInvoiceIssued = dto.laborInvoiceIssued;
    }
    if (dto.partsInvoiceIssued !== undefined) {
      updateData.partsInvoiceIssued = dto.partsInvoiceIssued;
    }

    const newLabor = dto.laborInvoiceIssued ?? order.laborInvoiceIssued;
    const newParts = dto.partsInvoiceIssued ?? order.partsInvoiceIssued;

    if (newLabor && newParts && order.status === ServiceOrderStatus.CLOSED) {
      updateData.status = ServiceOrderStatus.INVOICED;
      updateData.invoicedAt = new Date();
    }

    return this.prisma.serviceOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
        items: true,
        payments: true,
      },
    });
  }

  async cancel(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (
      order.status === ServiceOrderStatus.INVOICED ||
      order.status === ServiceOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot cancel an invoiced or already cancelled order',
      );
    }

    return this.prisma.serviceOrder.update({
      where: { id },
      data: {
        status: ServiceOrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────

  private async recalculateTotals(orderId: string) {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: { serviceOrderId: orderId },
    });

    let totalParts = new Decimal(0);
    let totalServices = new Decimal(0);

    for (const item of items) {
      if (item.type === ItemType.PART) {
        totalParts = totalParts.add(item.totalPrice);
      } else {
        totalServices = totalServices.add(item.totalPrice);
      }
    }

    const totalAmount = totalParts.add(totalServices);

    await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { totalParts, totalServices, totalAmount },
    });

    return { totalParts, totalServices, totalAmount };
  }
}
