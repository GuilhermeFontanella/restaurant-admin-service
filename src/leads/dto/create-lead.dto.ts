import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nomeEstabelecimento: string;

  @ApiProperty()
  @IsEmail()
  emailContato: string;

  @ApiProperty()
  @IsString()
  telefoneContato: string;
}
