import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TerminalModule } from '../terminal/terminal.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [AuthModule, TerminalModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
