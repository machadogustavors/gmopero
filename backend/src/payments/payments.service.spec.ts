import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, PaymentMethod } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, createMockPayment } from '../common/test';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof mockPrismaService>;

  const companyId = 'test-company-id';

  beforeEach(async () => {
    prisma = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('create', () => {
    it('should create payment when amount does not exceed order total', async () => {
      const order = {
        id: 'order-1',
        companyId,
        totalAmount: new Decimal(400),
        payments: [],
      };

      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      const payment = createMockPayment({
        serviceOrderId: 'order-1',
        amount: new Decimal(200),
        method: PaymentMethod.PIX,
      });
      prisma.payment.create.mockResolvedValue(payment);

      const result = await service.create(companyId, {
        serviceOrderId: 'order-1',
        method: PaymentMethod.PIX,
        amount: 200,
      });

      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when payment exceeds order total', async () => {
      const order = {
        id: 'order-1',
        companyId,
        totalAmount: new Decimal(400),
        payments: [{ amount: new Decimal(300) }],
      };

      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      await expect(
        service.create(companyId, {
          serviceOrderId: 'order-1',
          method: PaymentMethod.CASH,
          amount: 200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when service order does not exist', async () => {
      prisma.serviceOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.create(companyId, {
          serviceOrderId: 'non-existent',
          method: PaymentMethod.CASH,
          amount: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow multiple partial payments', async () => {
      const order = {
        id: 'order-1',
        companyId,
        totalAmount: new Decimal(400),
        payments: [{ amount: new Decimal(200) }],
      };

      prisma.serviceOrder.findFirst.mockResolvedValue(order);
      prisma.payment.create.mockResolvedValue(createMockPayment({ amount: new Decimal(200) }));

      const result = await service.create(companyId, {
        serviceOrderId: 'order-1',
        method: PaymentMethod.CREDIT_CARD,
        amount: 200,
      });

      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });
});
