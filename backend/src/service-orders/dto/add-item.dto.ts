import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { ItemType } from '@prisma/client';

export class AddItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsEnum(ItemType)
  type: ItemType;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  cfop?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
