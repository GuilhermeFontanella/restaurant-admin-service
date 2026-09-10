import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { BILLING_PERIODICIDADES, type BillingPeriodicidade } from '../billing-periodicidade';

export class CreateCheckoutDto {
  @ApiProperty()
  @IsString()
  planId: string;

  @ApiProperty({ enum: BILLING_PERIODICIDADES, required: false, default: 'MENSAL' })
  @IsOptional()
  @IsIn(BILLING_PERIODICIDADES)
  periodicidade?: BillingPeriodicidade;
}
