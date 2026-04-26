import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ItemType,
  Prisma,
  PurchaseInvoiceStatus,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { AddPurchaseInvoiceItemDto } from './dto/add-purchase-invoice-item.dto';

const Decimal = Prisma.Decimal;

@Injectable()
export class PurchaseInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreatePurchaseInvoiceDto) {
    const supplier = await this.ensureSupplier(companyId, dto.supplierId);

    if (!this.isSupplierCompleteForPurchases(supplier)) {
      throw new BadRequestException(
        'Supplier is incomplete. Fill taxId and full address before creating purchase invoice',
      );
    }

    if (dto.accessKey) {
      const existingByAccessKey = await this.prisma.purchaseInvoice.findFirst({
        where: {
          companyId,
          accessKey: dto.accessKey,
        },
        select: { id: true },
      });

      if (existingByAccessKey) {
        throw new BadRequestException('A purchase invoice with this access key already exists');
      }
    }

    if (!dto.items.length) {
      throw new BadRequestException('Purchase invoice must contain at least one item');
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        id: { in: productIds },
      },
      select: { id: true, description: true, type: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are invalid for this company');
    }

    if (products.some((product) => product.type !== ItemType.PART)) {
      throw new BadRequestException('Purchase invoice items must be linked to PART products only');
    }

    const productById = new Map(products.map((product) => [product.id, product]));

    const items = dto.items.map((item) => {
      const product = productById.get(item.productId)!;
      const quantity = new Decimal(item.quantity);
      const unitCost = new Decimal(item.unitCost);
      const totalCost = quantity.mul(unitCost);

      return {
        companyId,
        productId: item.productId,
        description: item.description ?? product.description,
        ncm: item.ncm,
        cfop: item.cfop,
        quantity,
        unitCost,
        totalCost,
      };
    });

    const totalAmount = items.reduce(
      (acc, item) => acc.add(item.totalCost),
      new Decimal(0),
    );

    return this.prisma.purchaseInvoice.create({
      data: {
        companyId,
        supplierId: dto.supplierId,
        invoiceNumber: dto.invoiceNumber,
        series: dto.series,
        accessKey: dto.accessKey,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        notes: dto.notes,
        totalAmount,
        items: { create: items },
      },
      include: {
        supplier: true,
        items: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findAll(
    companyId: string,
    status?: PurchaseInvoiceStatus,
    search?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseInvoiceWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
              { accessKey: { contains: search, mode: 'insensitive' } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true, taxId: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseInvoice.count({ where }),
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
    const purchaseInvoice = await this.prisma.purchaseInvoice.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                description: true,
                currentStock: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!purchaseInvoice) {
      throw new NotFoundException('Purchase invoice not found');
    }

    return purchaseInvoice;
  }

  async addItem(companyId: string, invoiceId: string, dto: AddPurchaseInvoiceItemDto) {
    const purchaseInvoice = await this.findOne(companyId, invoiceId);

    if (purchaseInvoice.status !== PurchaseInvoiceStatus.DRAFT) {
      throw new BadRequestException('Can only add items to draft purchase invoices');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId },
      select: { id: true, description: true, type: true },
    });

    if (!product) {
      throw new BadRequestException('Product not found for this company');
    }

    if (product.type !== ItemType.PART) {
      throw new BadRequestException('Only PART products can be used in purchase invoices');
    }

    const quantity = new Decimal(dto.quantity);
    const unitCost = new Decimal(dto.unitCost);
    const totalCost = quantity.mul(unitCost);

    const item = await this.prisma.purchaseInvoiceItem.create({
      data: {
        companyId,
        purchaseInvoiceId: invoiceId,
        productId: dto.productId,
        description: dto.description ?? product.description,
        ncm: dto.ncm,
        cfop: dto.cfop,
        quantity,
        unitCost,
        totalCost,
      },
    });

    await this.recalculateTotals(invoiceId);

    return item;
  }

  async receive(companyId: string, id: string) {
    const purchaseInvoice = await this.findOne(companyId, id);

    if (purchaseInvoice.status !== PurchaseInvoiceStatus.DRAFT) {
      throw new BadRequestException('Purchase invoice already received or cancelled');
    }

    if (!purchaseInvoice.items.length) {
      throw new BadRequestException('Purchase invoice has no items');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of purchaseInvoice.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
            unitCost: item.unitCost,
            lastReceivedAt: new Date(),
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            type: StockMovementType.PURCHASE_IN,
            quantity: item.quantity,
            unitCost: item.unitCost,
            referenceType: 'PURCHASE_INVOICE',
            referenceId: purchaseInvoice.id,
            notes: `Entrada automática pela nota de compra ${purchaseInvoice.invoiceNumber ?? purchaseInvoice.id}`,
          },
        });
      }

      return tx.purchaseInvoice.update({
        where: { id: purchaseInvoice.id },
        data: {
          status: PurchaseInvoiceStatus.RECEIVED,
          receivedAt: new Date(),
        },
        include: {
          supplier: true,
          items: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  }

  async importXmlPreview(companyId: string, xmlContent: string) {
    const invoiceNumber = this.matchTag(xmlContent, 'nNF');
    const series = this.matchTag(xmlContent, 'serie');
    const accessKey = this.matchAttribute(xmlContent, 'infNFe', 'Id')?.replace(/^NFe/, '');

    const itemBlocks = xmlContent.match(/<det[\s\S]*?<\/det>/g) ?? [];

    if (!itemBlocks.length) {
      throw new BadRequestException('No items found in XML');
    }

    const parsedItems = itemBlocks.map((block) => ({
      code: this.matchTag(block, 'cProd'),
      description: this.matchTag(block, 'xProd') ?? 'Item XML',
      ncm: this.matchTag(block, 'NCM'),
      cfop: this.matchTag(block, 'CFOP'),
      quantity: Number(this.matchTag(block, 'qCom') ?? '0'),
      unitCost: Number(this.matchTag(block, 'vUnCom') ?? '0'),
    }));

    const productCodes = parsedItems.map((item) => item.code).filter(Boolean) as string[];

    const matchedProducts = productCodes.length
      ? await this.prisma.product.findMany({
          where: {
            companyId,
            code: { in: productCodes },
          },
          select: {
            id: true,
            code: true,
            description: true,
            ncm: true,
            cfop: true,
          },
        })
      : [];

    const productByCode = new Map(
      matchedProducts
        .filter((product) => product.code)
        .map((product) => [product.code!, product]),
    );

    return {
      invoiceNumber,
      series,
      accessKey,
      items: parsedItems.map((item) => {
        const matchedProduct = item.code ? productByCode.get(item.code) : undefined;

        return {
          ...item,
          matchedProductId: matchedProduct?.id ?? null,
          matchedProductDescription: matchedProduct?.description ?? null,
          canAutoLink: Boolean(matchedProduct?.id),
        };
      }),
    };
  }

  private async ensureSupplier(companyId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, companyId },
      select: {
        id: true,
        taxId: true,
        zipCode: true,
        street: true,
        number: true,
        neighborhood: true,
        city: true,
        state: true,
        cityCode: true,
      },
    });

    if (!supplier) {
      throw new BadRequestException('Supplier not found for this company');
    }

    return supplier;
  }

  private isSupplierCompleteForPurchases(supplier: {
    taxId: string | null;
    zipCode: string | null;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cityCode: string | null;
  }) {
    return Boolean(
      supplier.taxId &&
      supplier.zipCode &&
      supplier.street &&
      supplier.number &&
      supplier.neighborhood &&
      supplier.city &&
      supplier.state &&
      supplier.cityCode,
    );
  }

  private async recalculateTotals(invoiceId: string) {
    const items = await this.prisma.purchaseInvoiceItem.findMany({
      where: { purchaseInvoiceId: invoiceId },
      select: { totalCost: true },
    });

    const totalAmount = items.reduce(
      (acc, item) => acc.add(item.totalCost),
      new Decimal(0),
    );

    return this.prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: { totalAmount },
    });
  }

  private matchTag(xml: string, tagName: string) {
    const regex = new RegExp(`<${tagName}>([^<]+)</${tagName}>`);
    const match = xml.match(regex);
    return match?.[1]?.trim() ?? null;
  }

  private matchAttribute(xml: string, tagName: string, attribute: string) {
    const regex = new RegExp(`<${tagName}[^>]*${attribute}="([^"]+)"`);
    const match = xml.match(regex);
    return match?.[1] ?? null;
  }
}
