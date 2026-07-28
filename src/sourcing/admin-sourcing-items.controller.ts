import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateSourcingItemDto,
  QuerySourcingItemsDto,
  ReorderSourcingItemsDto,
  UpdateSourcingItemDto,
} from './dto/sourcing.dto';
import { SourcingService } from './sourcing.service';

@Controller('admin/sourcing-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSourcingItemsController {
  constructor(private readonly sourcingService: SourcingService) {}

  @Get()
  findAll(@Query() query: QuerySourcingItemsDto) {
    return this.sourcingService.findItemsAdmin(query);
  }

  @Get('all')
  findAllUnpaged() {
    return this.sourcingService.findItemsAdminUnpaged();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sourcingService.findItemAdmin(id);
  }

  @Post()
  create(@Body() dto: CreateSourcingItemDto) {
    return this.sourcingService.createItem(dto);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderSourcingItemsDto) {
    return this.sourcingService.reorderItems(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSourcingItemDto) {
    return this.sourcingService.updateItem(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sourcingService.removeItem(id);
  }
}
