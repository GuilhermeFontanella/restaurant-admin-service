import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nome: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  preco: number;

  @ApiProperty({ enum: ['MENSAL', 'ANUAL'] })
  @IsIn(['MENSAL', 'ANUAL'])
  periodicidade: 'MENSAL' | 'ANUAL';
}
