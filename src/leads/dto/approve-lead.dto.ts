import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveLeadDto {
  @ApiProperty({
    required: false,
    description:
      'Plano a associar ao trial; se omitido, a assinatura fica sem plano definido até a ativação',
  })
  @IsOptional()
  @IsString()
  planId?: string;
}
