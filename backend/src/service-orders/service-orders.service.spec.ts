import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceOrderStatus, ItemType } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { ServiceOrdersService } from './service-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockPrismaService,
  createMockServiceOrder,
  createMockServiceOrderItem,
} from '../common/test';

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;
  let prisma: ReturnType<typeof mockPrismaService>;

  const companyId = 'test-company-id';

  beforeEach(async () => {
    prisma = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
  });

  describe('create', () => {
    it('should create service order with auto-incremented order number', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue({ orderNumber: 5 });

      const expected = createMockServiceOrder({ orderNumber: 6, companyId });
      prisma.serviceOrder.create.mockResolvedValue(expected);

      const result = await service.create(companyId, {
        customerId: 'cust-1',
        description: 'Oil change',
      });

      expect(prisma.serviceOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderNumber: 6 }),
        }),
      );
    });

    it('should start at order number 1 when no previous orders', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue(null);
      prisma.serviceOrder.create.mockResolvedValue(
        createMockServiceOrder({ orderNumber: 1 }),
      );

      await service.create(companyId, { customerId: 'cust-1' });

      expect(prisma.serviceOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderNumber: 1 }),
        }),
      );
    });
  });

  describe('status transitions', () => {
    it('should open a DRAFT order', async () => {
      const order = createMockServiceOrder({ status: ServiceOrderStatus.DRAFT });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);
      prisma.serviceOrder.update.mockResolvedValue({
        ...order,
        status: ServiceOrderStatus.OPEN,
      });

      const result = await service.open(companyId, order.id);

      expect(prisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ServiceOrderStatus.OPEN },
        }),
      );
    });

    it('should throw when trying to open a non-DRAFT order', async () => {
      const order = createMockServiceOrder({ status: ServiceOrderStatus.OPEN });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      await expect(service.open(companyId, order.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should close an OPEN order with items', async () => {
      const order = createMockServiceOrder({
        status: ServiceOrderStatus.OPEN,
        items: [createMockServiceOrderItem({ type: ItemType.SERVICE, productId: null })],
      });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      // $transaction passes a fresh prisma mock; capture it to assert
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const txPrisma = {
          serviceOrder: { update: jest.fn().mockResolvedValue({ ...order, status: ServiceOrderStatus.CLOSED }) },
          serviceOrderItem: { update: jest.fn() },
          product: { findFirst: jest.fn(), update: jest.fn() },
          stockMovement: { create: jest.fn() },
        };
        const result = await fn(txPrisma);
        expect(txPrisma.serviceOrder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: ServiceOrderStatus.CLOSED }),
          }),
        );
        return result;
      });

      await service.close(companyId, order.id);
    });

    it('should throw when closing an order with no items', async () => {
      const order = createMockServiceOrder({
        status: ServiceOrderStatus.OPEN,
        items: [],
      });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      await expect(service.close(companyId, order.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw when trying to close a DRAFT order', async () => {
      const order = createMockServiceOrder({ status: ServiceOrderStatus.DRAFT });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      await expect(service.close(companyId, order.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should cancel a DRAFT order', async () => {
      const order = createMockServiceOrder({ status: ServiceOrderStatus.DRAFT });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);
      prisma.serviceOrder.update.mockResolvedValue({
        ...order,
        status: ServiceOrderStatus.CANCELLED,
      });

      await service.cancel(companyId, order.id);

      expect(prisma.serviceOrder.update).toHaveBeenCalled();
    });

    it('should throw when cancelling an INVOICED order', async () => {
      const order = createMockServiceOrder({ status: ServiceOrderStatus.INVOICED });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      await expect(service.cancel(companyId, order.id))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('addItem', () => {
    it('should add item to DRAFT order and recalculate totals', async () => {
      const order = createMockServiceOrder({ status: ServiceOrderStatus.DRAFT, items: [] });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      const item = createMockServiceOrderItem({
        type: ItemType.PART,
        quantity: new Decimal(2),
        unitPrice: new Decimal(50),
        totalPrice: new Decimal(100),
      });
      prisma.serviceOrderItem.create.mockResolvedValue(item);
      prisma.serviceOrderItem.findMany.mockResolvedValue([item]);
      prisma.serviceOrder.update.mockResolvedValue({});

      const result = await service.addItem(companyId, order.id, {
        type: ItemType.PART,
        description: 'Oil Filter',
        quantity: 2,
        unitPrice: 50,
      });

      expect(prisma.serviceOrderItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalPrice: 100,
        }),
      });
    });

    it('should throw when adding item to CLOSED order', async () => {
      const order = createMockServiceOrder({ status: ServiceOrderStatus.CLOSED, items: [] });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      await expect(
        service.addItem(companyId, order.id, {
          type: ItemType.PART,
          description: 'Oil',
          quantity: 1,
          unitPrice: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when order does not exist', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue(null);

      await expect(service.findOne(companyId, 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
