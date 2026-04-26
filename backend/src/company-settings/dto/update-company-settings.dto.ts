import { IsString, IsOptional, IsEmail, IsInt, MaxLength, Min, Max } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  fiscalRegime?: number;
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

  @IsOptional()
  @IsString()
  @MaxLength(4)
  defaultIcmsCst?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  defaultIcmsCsosn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  defaultPisCst?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  defaultCofinsCst?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  defaultIcmsOrigem?: string;
}
