import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceOrderStatus } from '@prisma/client';

type ReceivablesFilter = {
  search?: string;
  status?: 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  dueInDays: number;
  page: number;
  limit: number;
};

type CashFlowFilter = {
  from?: string;
  to?: string;
};

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getReceivables(companyId: string, filter: ReceivablesFilter) {
    const { search, status, dueInDays, page, limit } = filter;

    const where: any = {
      companyId,
      status: {
        in: [ServiceOrderStatus.CLOSED, ServiceOrderStatus.INVOICED],
      },
    };

    if (search) {
      const parsedOrderNumber = Number(search);
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      if (!Number.isNaN(parsedOrderNumber)) {
        where.OR.push({ orderNumber: parsedOrderNumber });
      }
    }

    const orders = await this.prisma.serviceOrder.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        payments: {
          select: {
            amount: true,
            paidAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const now = new Date();

    const enriched = orders.map((order) => {
      const totalAmount = Number(order.totalAmount);
      const totalPaid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const pendingAmount = Math.max(0, totalAmount - totalPaid);

      const baseDate = order.closedAt ?? order.createdAt;
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + dueInDays);

      let computedStatus: 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE' = 'OPEN';
      if (pendingAmount <= 0) {
        computedStatus = 'PAID';
      } else if (dueDate < now) {
        computedStatus = 'OVERDUE';
      } else if (totalPaid > 0) {
        computedStatus = 'PARTIAL';
      }

      return {
        id: order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        status: computedStatus,
        dueDate: dueDate.toISOString(),
        closedAt: order.closedAt,
        totalAmount,
        totalPaid,
        pendingAmount,
        createdAt: order.createdAt,
      };
    });

    const filtered = status ? enriched.filter((item) => item.status === status) : enriched;

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const data = filtered.slice(offset, offset + limit);

    const summary = filtered.reduce(
      (acc, item) => {
        acc.totalAmount += item.totalAmount;
        acc.totalPaid += item.totalPaid;
        acc.totalPending += item.pendingAmount;
        if (item.pendingAmount > 0) acc.pendingCount += 1;
        if (item.status === 'OVERDUE') acc.overdueCount += 1;
        return acc;
      },
      {
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        pendingCount: 0,
        overdueCount: 0,
      },
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary,
    };
  }

  async getCashFlow(companyId: string, filter: CashFlowFilter) {
    const now = new Date();
    const from = filter.from ? new Date(filter.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = filter.to ? new Date(filter.to) : now;

    const [payments, purchaseInvoices] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          companyId,
          paidAt: {
            gte: from,
            lte: to,
          },
        },
        include: {
          serviceOrder: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
        orderBy: {
          paidAt: 'asc',
        },
      }),
      this.prisma.purchaseInvoice.findMany({
        where: {
          companyId,
          status: 'RECEIVED',
          receivedAt: {
            gte: from,
            lte: to,
          },
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          receivedAt: 'asc',
        },
      }),
    ]);

    const inflows = payments.map((payment) => ({
      id: payment.id,
      type: 'INFLOW' as const,
      date: payment.paidAt,
      amount: Number(payment.amount),
      description: `Recebimento OS #${payment.serviceOrder?.orderNumber ?? '-'}`,
      reference: payment.serviceOrderId,
    }));

    const outflows = purchaseInvoices.map((invoice) => ({
      id: invoice.id,
      type: 'OUTFLOW' as const,
      date: invoice.receivedAt ?? invoice.updatedAt,
      amount: Number(invoice.totalAmount),
      description: `Compra de estoque - ${invoice.supplier.name}`,
      reference: invoice.id,
    }));

    const movements = [...inflows, ...outflows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const totals = movements.reduce(
      (acc, movement) => {
        if (movement.type === 'INFLOW') {
          acc.inflows += movement.amount;
        } else {
          acc.outflows += movement.amount;
        }
        return acc;
      },
      { inflows: 0, outflows: 0 },
    );

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        inflows: totals.inflows,
        outflows: totals.outflows,
        balance: totals.inflows - totals.outflows,
      },
      movements,
    };
  }
}
