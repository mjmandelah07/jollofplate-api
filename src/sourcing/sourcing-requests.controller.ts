import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateSourcingRequestDto,
  QuerySourcingRequestsDto,
} from './dto/sourcing.dto';
import { SourcingService } from './sourcing.service';

type RequestUser = { user: { id: string; role: string } };

@Controller('sourcing-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class SourcingRequestsController {
  constructor(private readonly sourcingService: SourcingService) {}

  @Post()
  create(@Req() req: RequestUser, @Body() dto: CreateSourcingRequestDto) {
    return this.sourcingService.createRequest(req.user.id, dto);
  }

  @Get()
  findMine(@Req() req: RequestUser, @Query() query: QuerySourcingRequestsDto) {
    return this.sourcingService.findMyRequests(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: RequestUser, @Param('id') id: string) {
    return this.sourcingService.findMyRequest(req.user.id, id);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: RequestUser, @Param('id') id: string) {
    return this.sourcingService.cancelMyRequest(req.user.id, id);
  }
}
