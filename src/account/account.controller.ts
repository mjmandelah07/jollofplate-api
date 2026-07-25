import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccountService } from './account.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type RequestUser = { user: { id: string; role: string } };

@Controller('account')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  getProfile(@Req() req: RequestUser) {
    return this.accountService.getProfile(req.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.accountService.updateProfile(req.user.id, dto);
  }

  @Patch('password')
  changePassword(
    @Req() req: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.accountService.changePassword(req.user.id, dto);
  }
}
