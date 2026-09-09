import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateRestaurantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  razaoSocial?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  enderecoRua?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  enderecoNumero?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bairro?: string;

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
  cep?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  donoNome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  donoCpf?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  donoEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  donoTelefone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contatoNome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  contatoEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contatoTelefone?: string;
}
