import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nome: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ required: false, description: 'null = ilimitado' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  limiteMesas?: number;

  @ApiProperty({ required: false, description: 'null = ilimitado' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  limiteUsuarios?: number;

  @ApiProperty({ required: false, description: 'null = ilimitado' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  limiteProdutos?: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  preco: number;

  @ApiProperty({ enum: ['MENSAL', 'ANUAL'] })
  @IsIn(['MENSAL', 'ANUAL'])
  periodicidade: 'MENSAL' | 'ANUAL';
}
