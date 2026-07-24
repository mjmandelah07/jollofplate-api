import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { QueryCategoriesDto } from './dto/query-categories.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findPublic(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.findPublic(query);
  }
}
