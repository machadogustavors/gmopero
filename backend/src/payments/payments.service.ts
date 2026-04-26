import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreatePaymentDto) {
    // Verify the service order belongs to the company
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: dto.serviceOrderId, companyId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Service order not found');
    }

    // Calculate total already paid
    const totalPaid = order.payments.reduce(
      (sum, p) => sum.add(p.amount),
      new Decimal(0),
    );

    const newTotal = totalPaid.add(new Decimal(dto.amount));

    if (newTotal.greaterThan(order.totalAmount)) {
      throw new BadRequestException(
        `Payment exceeds order total. Order total: ${order.totalAmount}, already paid: ${totalPaid}, attempting: ${dto.amount}`,
      );
    }

    return this.prisma.payment.create({
      data: {
        companyId,
        serviceOrderId: dto.serviceOrderId,
        method: dto.method,
        amount: dto.amount,
        notes: dto.notes,
      },
    });
  }

  async findByServiceOrder(companyId: string, serviceOrderId: string) {
    return this.prisma.payment.findMany({
      where: { companyId, serviceOrderId },
      orderBy: { paidAt: 'desc' },
    });
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { companyId },
        skip,
        take: limit,
        include: {
          serviceOrder: {
            select: { id: true, orderNumber: true },
          },
        },
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { companyId } }),
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

  async remove(companyId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, companyId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.prisma.payment.delete({ where: { id } });
  }
}
