import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ServiceOrderStatus, ItemType, InvoiceType, InvoiceStatus } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { PlugnotasService } from './plugnotas.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockPrismaService,
  createMockCompany,
  createMockCustomer,
  createMockServiceOrder,
  createMockServiceOrderItem,
} from '../common/test';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PlugnotasService', () => {
  let service: PlugnotasService;
  let prisma: ReturnType<typeof mockPrismaService>;

  const companyId = 'test-company-id';

  beforeEach(async () => {
    prisma = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlugnotasService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                PLUGNOTAS_BASE_URL: 'https://api.sandbox.plugnotas.com.br',
                PLUGNOTAS_API_KEY: 'test-api-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PlugnotasService>(PlugnotasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('emitNfe', () => {
    it('should build correct payload and call PlugNotas API', async () => {
      const company = createMockCompany({ id: companyId, taxId: '08187168000160', legalName: 'Test LTDA' });
      const customer = createMockCustomer({ taxId: '12345678901', name: 'Carlos' });
      const items = [
        createMockServiceOrderItem({ type: ItemType.PART, description: 'Oil', ncm: '27101932', cfop: '5102' }),
      ];

      const order = createMockServiceOrder({
        id: 'order-1',
        companyId,
        status: ServiceOrderStatus.CLOSED,
        totalAmount: new Decimal(100),
        company,
        customer,
        items,
      });

      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          documents: [{ id: 'plugnotas-123' }],
          message: 'Processing',
        }),
      });

      prisma.invoice.create.mockResolvedValue({
        id: 'inv-1',
        plugnotasId: 'plugnotas-123',
        status: InvoiceStatus.PROCESSING,
      });

      const result = await service.emitNfe('order-1', companyId);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.plugnotas.com.br/nfe',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-KEY': 'test-api-key',
          }),
        }),
      );

      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId,
          serviceOrderId: 'order-1',
          plugnotasId: 'plugnotas-123',
          type: InvoiceType.NFE,
          status: InvoiceStatus.PROCESSING,
        }),
      });
    });

    it('should throw when service order is not CLOSED', async () => {
      const order = createMockServiceOrder({
        status: ServiceOrderStatus.OPEN,
        company: createMockCompany(),
      });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      await expect(service.emitNfe('order-1', companyId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw when company fiscal data is incomplete', async () => {
      const order = createMockServiceOrder({
        status: ServiceOrderStatus.CLOSED,
        company: createMockCompany({ taxId: null, legalName: null }),
      });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      await expect(service.emitNfe('order-1', companyId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw when PlugNotas API returns error', async () => {
      const order = createMockServiceOrder({
        status: ServiceOrderStatus.CLOSED,
        company: createMockCompany({ taxId: '08187168000160', legalName: 'Test' }),
        customer: createMockCustomer(),
        items: [createMockServiceOrderItem()],
      });
      prisma.serviceOrder.findFirst.mockResolvedValue(order);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid payload',
      });

      await expect(service.emitNfe('order-1', companyId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('processWebhook', () => {
    it('should update invoice and service order on CONCLUIDO status', async () => {
      const invoice = {
        id: 'inv-1',
        companyId: 'company-1',
        serviceOrderId: 'order-1',
        integrationId: 'int-1',
      };

      prisma.invoice.findUnique.mockResolvedValue(invoice);
      prisma.company.findFirst.mockResolvedValue({ id: 'company-1' });
      prisma.invoice.update.mockResolvedValue({});
      prisma.serviceOrder.update.mockResolvedValue({});

      const result = await service.processWebhook({
        id: 'plug-1',
        idIntegracao: 'int-1',
        status: 'CONCLUIDO',
        chave: '44-digit-key',
        numero: '1000',
        serie: '805',
        pdf: 'https://pdf-url.com',
        xml: 'https://xml-url.com',
        mensagem: 'Autorizado',
      });

      expect(result.processed).toBe(true);
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            status: InvoiceStatus.COMPLETED,
            accessKey: '44-digit-key',
          }),
        }),
      );
      expect(prisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            status: ServiceOrderStatus.INVOICED,
          }),
        }),
      );
    });

    it('should return processed false for unknown integration', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);

      const result = await service.processWebhook({
        id: 'plug-1',
        idIntegracao: 'unknown',
        status: 'CONCLUIDO',
      });

      expect(result.processed).toBe(false);
    });
  });
});
