import { IsString, IsOptional } from 'class-validator';

export class UpdateServiceOrderDto {
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
