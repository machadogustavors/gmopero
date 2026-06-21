import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  cityCode?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

}
