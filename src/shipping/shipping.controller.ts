import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GetShippingRatesDto } from './dto/get-shipping-rates.dto';
import { ShippingService } from './shipping.service';

type RequestUser = { user: { id: string; role: string } };

@Controller('shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  /** Live Terminal rates for checkout — customer picks one rateId */
  @Post('rates')
  getRates(@Req() req: RequestUser, @Body() dto: GetShippingRatesDto) {
    return this.shippingService.getRatesForCustomer(req.user.id, dto);
  }
}
