import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../common/decorators';
import type { CurrentUserPayload } from '../common/decorators';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(user.companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.paymentsService.findAll(user.companyId, page, limit);
  }

  @Get('service-order/:serviceOrderId')
  findByServiceOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.paymentsService.findByServiceOrder(user.companyId, serviceOrderId);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.paymentsService.remove(user.companyId, id);
  }
}
