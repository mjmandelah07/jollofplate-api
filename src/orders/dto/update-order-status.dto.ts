import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['PAID', 'CANCELLED'])
  status: 'PAID' | 'CANCELLED';
}
