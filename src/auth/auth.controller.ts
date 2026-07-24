import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Admin login */
  @Post('login')
  loginAdmin(@Body() dto: LoginDto) {
    return this.authService.loginAdmin(dto);
  }

  /** Customer registration */
  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  /** Customer login */
  @Post('customer/login')
  loginCustomer(@Body() dto: LoginDto) {
    return this.authService.loginCustomer(dto);
  }
}
