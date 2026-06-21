import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CompanySettingsService } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { CurrentUser, Roles } from '../common/decorators';
import type { CurrentUserPayload } from '../common/decorators';

@Controller('company-settings')
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.companySettingsService.getSettings(user.companyId);
  }

  @Patch()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    return this.companySettingsService.updateSettings(user.companyId, dto);
  }

}
