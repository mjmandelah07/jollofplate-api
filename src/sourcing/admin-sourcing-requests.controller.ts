import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SourcingRequestStatus } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  QuerySourcingRequestsDto,
  UpdateSourcingRequestStatusDto,
} from './dto/sourcing.dto';
import { SourcingService } from './sourcing.service';

@Controller('admin/sourcing-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSourcingRequestsController {
  constructor(private readonly sourcingService: SourcingService) {}

  @Get()
  findAll(@Query() query: QuerySourcingRequestsDto) {
    return this.sourcingService.findAllRequestsAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sourcingService.findOneRequestAdmin(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSourcingRequestStatusDto,
  ) {
    return this.sourcingService.updateRequestStatus(
      id,
      dto.status as SourcingRequestStatus,
    );
  }
}
