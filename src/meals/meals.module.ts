import { Module } from '@nestjs/common';
import { MealsService } from './meals.service';
import { MealsController } from './meals.controller';
import { AdminMealsController } from './admin-meals.controller';

@Module({
  controllers: [MealsController, AdminMealsController],
  providers: [MealsService],
  exports: [MealsService],
})
export class MealsModule {}
