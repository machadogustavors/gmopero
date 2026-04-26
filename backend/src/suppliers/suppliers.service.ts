import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateSupplierDto) {
    const normalized = this.normalizeDto(dto);
    this.validateRequiredSupplierFields(normalized);
    this.validateSupplierDocument(normalized.taxId);

    if (!normalized.name) {
      throw new BadRequestException('name is required');
    }

    return this.prisma.supplier.create({
      data: {
        companyId,
        name: normalized.name,
        taxId: normalized.taxId,
        email: normalized.email,
        phone: normalized.phone,
        street: normalized.street,
        number: normalized.number,
        complement: normalized.complement,
        neighborhood: normalized.neighborhood,
        cityCode: normalized.cityCode,
        city: normalized.city,
        state: normalized.state,
        zipCode: normalized.zipCode,
      },
    });
  }

  async findAll(companyId: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
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
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(companyId: string, id: string, dto: UpdateSupplierDto) {
    const existing = await this.findOne(companyId, id);
    const normalized = this.normalizeDto(dto);

    const merged = {
      ...existing,
      ...normalized,
    };

    this.validateRequiredSupplierFields(merged);
    this.validateSupplierDocument(merged.taxId ?? undefined);

    return this.prisma.supplier.update({
      where: { id },
      data: normalized,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const linkedInvoices = await this.prisma.purchaseInvoice.count({
      where: {
        companyId,
        supplierId: id,
      },
    });

    if (linkedInvoices > 0) {
      throw new BadRequestException(
        'Cannot remove supplier with linked purchase invoices',
      );
    }

    return this.prisma.supplier.delete({
      where: { id },
    });
  }

  private normalizeDto(dto: Partial<CreateSupplierDto>) {
    const clean = (value?: string) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    };

    const taxIdDigits = clean(dto.taxId)?.replace(/\D/g, '');
    const phoneDigits = clean(dto.phone)?.replace(/\D/g, '');
    const zipDigits = clean(dto.zipCode)?.replace(/\D/g, '');
    const state = clean(dto.state)?.toUpperCase();

    return {
      name: clean(dto.name),
      taxId: taxIdDigits,
      email: clean(dto.email),
      phone: phoneDigits,
      street: clean(dto.street),
      number: clean(dto.number),
      complement: clean(dto.complement),
      neighborhood: clean(dto.neighborhood),
      cityCode: clean(dto.cityCode),
      city: clean(dto.city),
      state,
      zipCode: zipDigits,
    };
  }

  private validateRequiredSupplierFields(supplier: Partial<CreateSupplierDto>) {
    const required: Array<keyof CreateSupplierDto> = [
      'name',
      'taxId',
      'zipCode',
      'street',
      'number',
      'neighborhood',
      'city',
      'state',
      'cityCode',
    ];

    const missing = required.filter((field) => !supplier[field]);

    if (missing.length) {
      throw new BadRequestException(
        `Missing required supplier fields: ${missing.join(', ')}`,
      );
    }
  }

  private validateSupplierDocument(taxId?: string) {
    if (!taxId) {
      throw new BadRequestException('taxId is required');
    }

    if (taxId.length === 11) {
      if (!this.isValidCpf(taxId)) {
        throw new BadRequestException('Invalid CPF');
      }
      return;
    }

    if (taxId.length === 14) {
      if (!this.isValidCnpj(taxId)) {
        throw new BadRequestException('Invalid CNPJ');
      }
      return;
    }

    throw new BadRequestException('taxId must contain 11 (CPF) or 14 (CNPJ) digits');
  }

  private isValidCpf(cpf: string) {
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i += 1) {
      sum += Number(cpf[i]) * (10 - i);
    }
    let digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    if (digit !== Number(cpf[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i += 1) {
      sum += Number(cpf[i]) * (11 - i);
    }
    digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    return digit === Number(cpf[10]);
  }

  private isValidCnpj(cnpj: string) {
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calcDigit = (base: string, factors: number[]) => {
      const total = base
        .split('')
        .reduce((sum, value, index) => sum + Number(value) * factors[index], 0);
      const remainder = total % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstDigit = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const secondDigit = calcDigit(cnpj.slice(0, 12) + firstDigit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
  }
}
