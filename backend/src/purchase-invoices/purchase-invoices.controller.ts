import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PurchaseInvoiceStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators';
import type { CurrentUserPayload } from '../common/decorators';
import { AddPurchaseInvoiceItemDto } from './dto/add-purchase-invoice-item.dto';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(private readonly purchaseInvoicesService: PurchaseInvoicesService) {}

  private static readonly fileHasBuffer = (file: unknown): file is { buffer: Buffer } => {
    if (!file || typeof file !== 'object') return false;
    const maybeFile = file as { buffer?: unknown };
    return Buffer.isBuffer(maybeFile.buffer);
  };

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePurchaseInvoiceDto,
  ) {
    return this.purchaseInvoicesService.create(user.companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: PurchaseInvoiceStatus,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.purchaseInvoicesService.findAll(
      user.companyId,
      status,
      search,
      page,
      limit,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.purchaseInvoicesService.findOne(user.companyId, id);
  }

  @Post(':id/items')
  addItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AddPurchaseInvoiceItemDto,
  ) {
    return this.purchaseInvoicesService.addItem(user.companyId, id, dto);
  }

  @Post(':id/receive')
  receive(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.purchaseInvoicesService.receive(user.companyId, id);
  }

  @Post('import-xml')
  @UseInterceptors(
    FileInterceptor('xml', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const lowerName = file.originalname.toLowerCase();
        const isXml = file.mimetype === 'application/xml'
          || file.mimetype === 'text/xml'
          || lowerName.endsWith('.xml');
        callback(isXml ? null : new BadRequestException('Arquivo deve ser XML válido'), isXml);
      },
    }),
  )
  importXml(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: unknown,
  ) {
    if (!PurchaseInvoicesController.fileHasBuffer(file)) {
      throw new BadRequestException('XML file is required');
    }

    return this.purchaseInvoicesService.importXmlPreview(
      user.companyId,
      file.buffer.toString('utf-8'),
    );
  }
}
