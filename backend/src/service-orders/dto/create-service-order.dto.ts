import { IsString, IsOptional } from 'class-validator';

export class CreateServiceOrderDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
