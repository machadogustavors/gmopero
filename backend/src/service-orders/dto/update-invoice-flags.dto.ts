import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateInvoiceFlagsDto {
  @IsOptional()
  @IsBoolean()
  laborInvoiceIssued?: boolean;

  @IsOptional()
  @IsBoolean()
  partsInvoiceIssued?: boolean;
}
