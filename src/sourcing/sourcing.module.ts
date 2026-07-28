import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSourcingItemsController } from './admin-sourcing-items.controller';
import { AdminSourcingRequestsController } from './admin-sourcing-requests.controller';
import { SourcingItemsController } from './sourcing-items.controller';
import { SourcingRequestsController } from './sourcing-requests.controller';
import { SourcingService } from './sourcing.service';

@Module({
  imports: [AuthModule],
  controllers: [
    SourcingItemsController,
    SourcingRequestsController,
    AdminSourcingItemsController,
    AdminSourcingRequestsController,
  ],
  providers: [SourcingService],
  exports: [SourcingService],
})
export class SourcingModule {}
