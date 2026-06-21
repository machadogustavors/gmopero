import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, createMockCompany } from '../common/test';

describe('CompanySettingsService', () => {
  let service: CompanySettingsService;
  let prisma: ReturnType<typeof mockPrismaService>;

  const companyId = 'test-company-id';

  beforeEach(async () => {
    prisma = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanySettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CompanySettingsService>(CompanySettingsService);
  });

  describe('getSettings', () => {
    it('should return company settings', async () => {
      const company = createMockCompany({ id: companyId });
      prisma.company.findUnique.mockResolvedValue(company);

      const result = await service.getSettings(companyId);

      expect(result.id).toBe(companyId);
    });

    it('should throw NotFoundException when company does not exist', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(service.getSettings(companyId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('should update company fiscal data', async () => {
      const company = createMockCompany({ id: companyId });
      prisma.company.findUnique.mockResolvedValue(company);
      prisma.company.update.mockResolvedValue({
        ...company,
        taxId: '99999999000199',
      });

      const result = await service.updateSettings(companyId, {
        taxId: '99999999000199',
      });

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: companyId },
        data: { taxId: '99999999000199' },
      });
    });
  });

});
