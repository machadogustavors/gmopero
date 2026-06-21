import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Injectable()
export class CompanySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async updateSettings(companyId: string, dto: UpdateCompanySettingsDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: dto,
    });
  }

}
