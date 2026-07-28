import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { MealsModule } from './meals/meals.module';
import { UploadsModule } from './uploads/uploads.module';
import { SettingsModule } from './settings/settings.module';
import { StatsModule } from './stats/stats.module';
import { OrdersModule } from './orders/orders.module';
import { AddressesModule } from './addresses/addresses.module';
import { AccountModule } from './account/account.module';
import { SourcingModule } from './sourcing/sourcing.module';
import { TerminalModule } from './terminal/terminal.module';
import { ShippingModule } from './shipping/shipping.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    MealsModule,
    UploadsModule,
    SettingsModule,
    StatsModule,
    OrdersModule,
    AddressesModule,
    AccountModule,
    SourcingModule,
    TerminalModule,
    ShippingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
