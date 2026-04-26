import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators';
import type { CurrentUserPayload } from '../common/decorators';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('receivables')
  getReceivables(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('status') status?: 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE',
    @Query('dueInDays') dueInDays?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.getReceivables(user.companyId, {
      search,
      status,
      dueInDays: dueInDays ? Number(dueInDays) : 30,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('cash-flow')
  getCashFlow(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financeService.getCashFlow(user.companyId, {
      from,
      to,
    });
  }
}
