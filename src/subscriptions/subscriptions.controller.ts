import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';

@Auth()
@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post(':restaurantId/activate')
  @ApiOperation({ summary: 'Marca a assinatura de um restaurante como paga/ativa e reativa o tenant se estava suspenso' })
  activate(@Param('restaurantId') restaurantId: string, @Body() dto: ActivateSubscriptionDto) {
    return this.subscriptionsService.activate(restaurantId, dto);
  }
}
