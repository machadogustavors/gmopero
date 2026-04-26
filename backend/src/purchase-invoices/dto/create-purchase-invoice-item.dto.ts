import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePurchaseInvoiceItemDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  cfop?: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;
}
