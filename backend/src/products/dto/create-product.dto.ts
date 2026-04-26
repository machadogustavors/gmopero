import { IsString, IsOptional, IsEnum, IsNumber, MaxLength, Min, IsBoolean } from 'class-validator';
import { ItemType } from '@prisma/client';

export class CreateProductDto {
  @IsEnum(ItemType)
  type: ItemType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @MaxLength(300)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ncm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  cfop?: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;
}
