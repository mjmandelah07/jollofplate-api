import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrdersService } from './orders.service';

type RequestUser = { user: { id: string; role: string } };

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Req() req: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.ordersService.removeItem(req.user, id, itemId);
  }
}
