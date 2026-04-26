import { IsOptional, IsUUID } from 'class-validator';

export class ImportPurchaseXmlDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}
