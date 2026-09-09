import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nomeEstabelecimento: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  nomeDono: string;

  @ApiProperty()
  @IsEmail()
  emailContato: string;

  @ApiProperty()
  @IsString()
  telefoneContato: string;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  planoInteresseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mensagem?: string;
}
