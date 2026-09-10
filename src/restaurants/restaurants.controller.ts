import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Auth()
@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os restaurantes cadastrados com sua assinatura atual',
  })
  findAll() {
    return this.restaurantsService.findAll();
  }

  @Get('stats')
  @ApiOperation({
    summary:
      'Painel de números: assinaturas ativas, aguardando aprovação, próximas de vencer, inativas e faturamento mensal',
  })
  getStats() {
    return this.restaurantsService.getStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca um restaurante pelo id, com lead de origem e assinatura',
  })
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados cadastrais de um restaurante' })
  update(@Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantsService.update(id, dto);
  }

  @Post(':id/suspend')
  @ApiOperation({
    summary:
      'Suspende o acesso do restaurante ao Order Manager e notifica por e-mail',
  })
  suspend(@Param('id') id: string) {
    return this.restaurantsService.suspend(id);
  }

  @Post(':id/reactivate')
  @ApiOperation({
    summary:
      'Reativa o acesso do restaurante ao Order Manager e notifica por e-mail',
  })
  reactivate(@Param('id') id: string) {
    return this.restaurantsService.reactivate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Exclui definitivamente o restaurante e seu tenant (só após 3 meses do fim do último ciclo pago)',
  })
  remove(@Param('id') id: string) {
    return this.restaurantsService.remove(id);
  }
}
