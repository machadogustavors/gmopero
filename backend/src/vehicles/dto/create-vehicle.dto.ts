import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  customerId: string;

  @IsString()
  @MaxLength(10)
  licensePlate: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;
}
