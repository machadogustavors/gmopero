import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { StockMovementType, UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators';
import type { CurrentUserPayload } from '../common/decorators';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  getStock(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('lowOnly', new DefaultValuePipe(false), ParseBoolPipe) lowOnly?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.inventoryService.getStock(user.companyId, search, lowOnly, page, limit);
  }

  @Get('movements')
  getMovements(
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type?: StockMovementType,
    @Query('productId') productId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.inventoryService.getMovements(user.companyId, type, productId, page, limit);
  }

  @Get('replenishment-suggestions')
  getReplenishmentSuggestions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.inventoryService.getReplenishmentSuggestions(user.companyId, days, limit);
  }

  @Post('adjustments')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createAdjustment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    return this.inventoryService.createAdjustment(user.companyId, user.userId, dto);
  }
}
