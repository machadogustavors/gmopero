import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, createMockVehicle } from '../common/test';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: ReturnType<typeof mockPrismaService>;

  const companyId = 'test-company-id';

  beforeEach(async () => {
    prisma = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  describe('create', () => {
    it('should create a vehicle with uppercase license plate', async () => {
      const dto = {
        customerId: 'cust-1',
        licensePlate: 'abc1d23',
        brand: 'Fiat',
        model: 'Argo',
      };

      prisma.vehicle.findUnique.mockResolvedValue(null);
      const expected = createMockVehicle({ ...dto, licensePlate: 'ABC1D23', companyId });
      prisma.vehicle.create.mockResolvedValue(expected);

      const result = await service.create(companyId, dto);

      expect(prisma.vehicle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ licensePlate: 'ABC1D23' }),
      });
    });

    it('should throw ConflictException for duplicate license plate', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(createMockVehicle());

      await expect(
        service.create(companyId, { customerId: 'c1', licensePlate: 'ABC1D23' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return vehicle with customer', async () => {
      const vehicle = createMockVehicle({ companyId });
      prisma.vehicle.findFirst.mockResolvedValue(vehicle);

      const result = await service.findOne(companyId, vehicle.id);
      expect(result.id).toBe(vehicle.id);
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findOne(companyId, 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
