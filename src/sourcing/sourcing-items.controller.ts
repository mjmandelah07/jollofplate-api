import { Controller, Get, Query } from '@nestjs/common';
import { QuerySourcingItemsDto } from './dto/sourcing.dto';
import { SourcingService } from './sourcing.service';

@Controller('sourcing-items')
export class SourcingItemsController {
  constructor(private readonly sourcingService: SourcingService) {}

  @Get()
  findPublic(@Query() query: QuerySourcingItemsDto) {
    return this.sourcingService.findItemsPublic(query);
  }
}
