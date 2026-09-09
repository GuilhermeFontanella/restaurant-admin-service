import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ApproveLeadDto } from './dto/approve-lead.dto';
import { RejectLeadDto } from './dto/reject-lead.dto';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Recebe um lead do formulário de interesse da landing page (rota pública)' })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Auth()
  @Get()
  @ApiOperation({ summary: 'Lista os leads recebidos' })
  findAll() {
    return this.leadsService.findAll();
  }

  @Auth()
  @Get(':id')
  @ApiOperation({ summary: 'Busca um lead pelo id' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Auth()
  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprova o lead: cria o restaurante, o trial, provisiona o tenant no order-manager e envia o e-mail de onboarding' })
  approve(@Param('id') id: string, @Body() dto: ApproveLeadDto) {
    return this.leadsService.approve(id, dto);
  }

  @Auth()
  @Post(':id/reject')
  @ApiOperation({ summary: 'Rejeita o lead' })
  reject(@Param('id') id: string, @Body() dto: RejectLeadDto) {
    return this.leadsService.reject(id, dto);
  }
}
