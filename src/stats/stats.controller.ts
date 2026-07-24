import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StatsService } from './stats.service';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getDashboardStats() {
    return this.statsService.getDashboardStats();
  }
}
