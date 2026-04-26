import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ServiceOrderStatus } from '@prisma/client';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { AddItemDto } from './dto/add-item.dto';
import { CurrentUser } from '../common/decorators';
import type { CurrentUserPayload } from '../common/decorators';

@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateServiceOrderDto,
  ) {
    return this.serviceOrdersService.create(user.companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: ServiceOrderStatus,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.serviceOrdersService.findAll(user.companyId, status, search, page, limit);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.findOne(user.companyId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(user.companyId, id, dto);
  }

  // ── Items ──────────────────────────────────────

  @Post(':id/items')
  addItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    return this.serviceOrdersService.addItem(user.companyId, id, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.serviceOrdersService.removeItem(user.companyId, id, itemId);
  }

  // ── Status Transitions ────────────────────────

  @Patch(':id/open')
  open(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.open(user.companyId, id);
  }

  @Patch(':id/close')
  close(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.close(user.companyId, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.cancel(user.companyId, id);
  }
}
