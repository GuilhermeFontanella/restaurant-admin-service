import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CompleteLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nomeDono: string;

  @ApiProperty()
  @IsString()
  @MinLength(11)
  cnpj: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  uf?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  senha: string;

  @ApiProperty({
    required: false,
    description: 'Se omitido, usa o plano padrão de teste grátis',
  })
  @IsOptional()
  @IsString()
  planoInteresseId?: string;
}
