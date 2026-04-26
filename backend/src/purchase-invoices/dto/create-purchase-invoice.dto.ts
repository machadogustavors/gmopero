import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseInvoiceItemDto } from './create-purchase-invoice-item.dto';

export class CreatePurchaseInvoiceDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  series?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{44}$/, { message: 'accessKey must contain 44 digits' })
  @MaxLength(60)
  accessKey?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @IsNotEmpty({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseInvoiceItemDto)
  items!: CreatePurchaseInvoiceItemDto[];
}
