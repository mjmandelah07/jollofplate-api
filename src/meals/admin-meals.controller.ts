import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MealsService } from './meals.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';

@Controller('admin/meals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminMealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  findAll() {
    return this.mealsService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mealsService.findOneAdmin(id);
  }

  @Post()
  create(@Body() dto: CreateMealDto) {
    return this.mealsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMealDto) {
    return this.mealsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mealsService.remove(id);
  }
}
