import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: {
        companyId_licensePlate: {
          companyId,
          licensePlate: dto.licensePlate.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException('A vehicle with this license plate already exists');
    }

    return this.prisma.vehicle.create({
      data: {
        companyId,
        ...dto,
        licensePlate: dto.licensePlate.toUpperCase(),
      },
    });
  }

  async findAll(companyId: string, customerId?: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { licensePlate: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { licensePlate: 'asc' },
      }),
      this.prisma.vehicle.count({ where }),
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
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
      include: { customer: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async findByLicensePlate(companyId: string, licensePlate: string) {
    return this.prisma.vehicle.findUnique({
      where: {
        companyId_licensePlate: {
          companyId,
          licensePlate: licensePlate.toUpperCase(),
        },
      },
      include: { customer: true },
    });
  }

  async update(companyId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOne(companyId, id);

    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.vehicle.delete({
      where: { id },
    });
  }
}
