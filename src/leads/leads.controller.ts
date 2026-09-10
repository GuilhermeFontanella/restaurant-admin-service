import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CompleteLeadDto } from './dto/complete-lead.dto';
import { ApproveLeadDto } from './dto/approve-lead.dto';
import { RejectLeadDto } from './dto/reject-lead.dto';
import { FindLeadsQueryDto } from './dto/find-leads-query.dto';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Recebe um pré-cadastro do formulário da landing page e envia o e-mail de confirmação (rota pública)',
  })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get('confirm/:token')
  @ApiOperation({
    summary:
      'Valida o link de confirmação e retorna os dados para prefill do formulário de conclusão (rota pública)',
  })
  findByToken(@Param('token') token: string) {
    return this.leadsService.findByToken(token);
  }

  @Post('confirm/:token')
  @ApiOperation({
    summary:
      'Conclui o pré-cadastro com os dados restantes; o lead volta para a fila de aprovação (rota pública)',
  })
  complete(@Param('token') token: string, @Body() dto: CompleteLeadDto) {
    return this.leadsService.complete(token, dto);
  }

  @Auth()
  @Get()
  @ApiOperation({
    summary:
      'Lista os leads recebidos, com busca/filtro opcional; pendentes de aprovação vêm primeiro (mais antigos primeiro)',
  })
  findAll(@Query() query: FindLeadsQueryDto) {
    return this.leadsService.findAll(query);
  }

  @Auth()
  @Get(':id')
  @ApiOperation({ summary: 'Busca um lead pelo id' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Auth()
  @Post(':id/approve')
  @ApiOperation({
    summary:
      'Aprova o lead: cria o restaurante, o trial, provisiona o tenant no order-manager e envia o e-mail de onboarding',
  })
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
