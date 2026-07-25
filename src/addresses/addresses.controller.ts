import {
  Body,
  Controller,
  Delete,
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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { QueryAddressesDto } from './dto/query-addresses.dto';

type RequestUser = { user: { id: string; role: string } };

@Controller('addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  findMine(@Req() req: RequestUser, @Query() query: QueryAddressesDto) {
    return this.addressesService.findMine(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: RequestUser, @Param('id') id: string) {
    return this.addressesService.findOne(req.user.id, id);
  }

  @Post()
  create(@Req() req: RequestUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(req.user.id, dto);
  }

  @Patch(':id/default')
  setDefault(@Req() req: RequestUser, @Param('id') id: string) {
    return this.addressesService.setDefault(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: RequestUser, @Param('id') id: string) {
    return this.addressesService.remove(req.user.id, id);
  }
}
