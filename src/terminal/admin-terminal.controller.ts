import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { QueryTerminalListDto } from './dto/query-terminal-list.dto';
import { TerminalService } from './terminal.service';

@Controller('admin/terminal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTerminalController {
  constructor(private readonly terminal: TerminalService) {}

  /** Verify API keys / account connectivity */
  @Get('status')
  status() {
    return this.terminal.getConnectionStatus();
  }

  /** Active carriers (paged) — Terminal has ~30+; use ?page=&limit= */
  @Get('carriers')
  carriers(@Query() query: QueryTerminalListDto) {
    return this.terminal.listActiveCarriers(query.page ?? 1, query.limit ?? 20);
  }

  /** Packaging types (paged) */
  @Get('packaging')
  packaging(@Query() query: QueryTerminalListDto) {
    return this.terminal.listPackaging(query.page ?? 1, query.limit ?? 20);
  }
}
