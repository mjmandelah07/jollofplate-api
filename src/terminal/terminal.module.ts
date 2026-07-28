import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminTerminalController } from './admin-terminal.controller';
import { TerminalService } from './terminal.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminTerminalController],
  providers: [TerminalService],
  exports: [TerminalService],
})
export class TerminalModule {}
