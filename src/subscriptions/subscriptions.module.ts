import { Module } from '@nestjs/common';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { SubscriptionsController } from './subscriptions.controller';
import { InternalSubscriptionsController } from './internal-subscriptions.controller';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [MercadoPagoModule],
  controllers: [
    SubscriptionsController,
    InternalSubscriptionsController,
    MercadoPagoWebhookController,
  ],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
