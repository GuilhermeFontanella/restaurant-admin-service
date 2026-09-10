import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const STATUS_VALUES = [
  'AWAITING_CONFIRMATION',
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const;

export class FindLeadsQueryDto {
  @ApiProperty({
    required: false,
    description:
      'Busca por nome do estabelecimento, responsável, e-mail, telefone ou CNPJ',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: (typeof STATUS_VALUES)[number];

  @ApiProperty({ required: false, description: 'UF do estabelecimento' })
  @IsOptional()
  @IsString()
  uf?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}
