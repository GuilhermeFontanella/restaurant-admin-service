import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('webhooks')
@Controller('webhooks/mercadopago')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @ApiOperation({ summary: 'Recebe notificações de assinatura do Mercado Pago' })
  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() body: Record<string, unknown>) {
    const { type, id } = this.extractEvent(body);

    if (!id) {
      return { ok: true };
    }

    try {
      if (type === 'preapproval' || type === 'subscription_preapproval') {
        await this.subscriptionsService.handlePreapprovalEvent(id);
      } else if (type === 'payment') {
        await this.subscriptionsService.handlePaymentEvent(id);
      }
    } catch (error) {
      // Sempre retorna 200 para o MP não reenviar desnecessariamente
      this.logger.error(`Erro ao processar webhook MP type=${type} id=${id}`, error);
    }

    return { ok: true };
  }

  private extractEvent(body: Record<string, unknown>): { type: string | null; id: string | null } {
    const type = (body?.type as string) ?? (body?.topic as string) ?? null;
    const data = body?.data as Record<string, unknown> | undefined;
    const id =
      (data?.id as string) ??
      (typeof body?.resource === 'string' ? body.resource.split('/').pop()! : null) ??
      null;
    return { type, id };
  }
}
