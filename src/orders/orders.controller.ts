import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type RequestUser = { user: { id: string; role: string } };

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: RequestUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.createForCustomer(req.user.id, dto);
  }

  @Get()
  findMine(@Req() req: RequestUser) {
    return this.ordersService.findMine(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: RequestUser, @Param('id') id: string) {
    return this.ordersService.findOneForCustomer(req.user.id, id);
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
