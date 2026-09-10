import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalAuth } from '../auth/decorators/internal-auth.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@InternalAuth()
@ApiTags('internal')
@Controller('internal/restaurants')
export class InternalSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get(':tenantSlug/subscription')
  @ApiOperation({
    summary: '[Interno] Retorna a assinatura atual e os planos disponíveis de um restaurante',
  })
  getSubscription(@Param('tenantSlug') tenantSlug: string) {
    return this.subscriptionsService.getSubscriptionInfo(tenantSlug);
  }

  @Post(':tenantSlug/subscription/checkout')
  @ApiOperation({
    summary: '[Interno] Cria um link de checkout do Mercado Pago para o plano escolhido',
  })
  createCheckout(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.subscriptionsService.createCheckout(tenantSlug, dto);
  }
}
