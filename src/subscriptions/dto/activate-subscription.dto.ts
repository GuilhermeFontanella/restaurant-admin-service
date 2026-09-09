import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class ActivateSubscriptionDto {
  @ApiProperty()
  @IsString()
  planId: string;

  @ApiProperty({ description: 'Data em que o período pago atual termina' })
  @IsDateString()
  currentPeriodEnd: string;
}
