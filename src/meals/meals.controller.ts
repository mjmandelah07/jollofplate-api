import { Controller, Get, Param, Query } from '@nestjs/common';
import { MealsService } from './meals.service';
import { QueryMealsDto } from './dto/query-meals.dto';

@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  findPublic(@Query() query: QueryMealsDto) {
    return this.mealsService.findPublic(query);
  }

  @Get('featured')
  findFeatured() {
    return this.mealsService.findFeatured();
  }

  @Get('best-sellers')
  findBestSellers() {
    return this.mealsService.findBestSellers();
  }

  /** You may also like — up to 4 related meals (same category, then fill) */
  @Get(':slug/related')
  findRelated(@Param('slug') slug: string) {
    return this.mealsService.findRelated(slug);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.mealsService.findBySlug(slug);
  }
}
