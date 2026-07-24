import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
