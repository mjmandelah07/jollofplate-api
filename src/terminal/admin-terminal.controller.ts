import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
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

  /** Sample: list active carriers (confirms shipping API works) */
  @Get('carriers')
  carriers() {
    return this.terminal.listActiveCarriers();
  }

  /** Packaging types configured in Terminal dashboard */
  @Get('packaging')
  packaging() {
    return this.terminal.listPackaging();
  }
}
