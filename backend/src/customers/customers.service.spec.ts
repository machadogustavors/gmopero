import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, createMockCustomer } from '../common/test';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: ReturnType<typeof mockPrismaService>;

  const companyId = 'test-company-id';

  beforeEach(async () => {
    prisma = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('create', () => {
    it('should create a customer with companyId', async () => {
      const dto = { name: 'Carlos Silva', taxId: '12345678901' };
      const expected = createMockCustomer({ ...dto, companyId });

      prisma.customer.create.mockResolvedValue(expected);

      const result = await service.create(companyId, dto);

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: { companyId, ...dto },
      });
      expect(result.name).toBe('Carlos Silva');
    });
  });

  describe('findAll', () => {
    it('should return paginated customers', async () => {
      const customers = [createMockCustomer(), createMockCustomer()];
      prisma.customer.findMany.mockResolvedValue(customers);
      prisma.customer.count.mockResolvedValue(2);

      const result = await service.findAll(companyId);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by search term', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      await service.findAll(companyId, 'Carlos');

      const whereArg = prisma.customer.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeDefined();
      expect(whereArg.companyId).toBe(companyId);
    });
  });

  describe('findOne', () => {
    it('should return customer with vehicles', async () => {
      const customer = createMockCustomer({ companyId });
      prisma.customer.findFirst.mockResolvedValue(customer);

      const result = await service.findOne(companyId, customer.id);

      expect(result.id).toBe(customer.id);
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.findOne(companyId, 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update customer', async () => {
      const customer = createMockCustomer({ companyId });
      prisma.customer.findFirst.mockResolvedValue(customer);
      prisma.customer.update.mockResolvedValue({ ...customer, name: 'Updated' });

      const result = await service.update(companyId, customer.id, { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete customer', async () => {
      const customer = createMockCustomer({ companyId });
      prisma.customer.findFirst.mockResolvedValue(customer);
      prisma.customer.delete.mockResolvedValue(customer);

      const result = await service.remove(companyId, customer.id);

      expect(prisma.customer.delete).toHaveBeenCalledWith({ where: { id: customer.id } });
    });
  });
});
