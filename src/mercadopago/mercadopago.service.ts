import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig, { PreApproval, Payment } from 'mercadopago';

export interface CreatePreapprovalParams {
  reason: string;
  payerEmail: string;
  transactionAmount: number;
  frequency: number;
  frequencyType: 'months' | 'years';
  externalReference: string;
  backUrl: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly preApproval: PreApproval;
  private readonly payment: Payment;

  constructor(config: ConfigService) {
    const accessToken = config.get<string>('MP_ACCESS_TOKEN')!;
    const client = new MercadoPagoConfig({ accessToken });
    this.preApproval = new PreApproval(client);
    this.payment = new Payment(client);
  }

  async createPreapproval(params: CreatePreapprovalParams) {
    // A URL de notificação do Preapproval não é enviada por requisição — precisa
    // ser configurada uma vez no painel do Mercado Pago (Suas integrações > Webhooks)
    // apontando para `${MP_WEBHOOK_BASE_URL}/webhooks/mercadopago`.
    return this.call('criar preapproval', () =>
      this.preApproval.create({
        body: {
          reason: params.reason,
          payer_email: params.payerEmail,
          external_reference: params.externalReference,
          back_url: params.backUrl,
          auto_recurring: {
            frequency: params.frequency,
            frequency_type: params.frequencyType,
            transaction_amount: params.transactionAmount,
            currency_id: 'BRL',
          },
          status: 'pending',
        },
      }),
    );
  }

  async getPreapproval(id: string) {
    return this.call('buscar preapproval', () => this.preApproval.get({ id }));
  }

  async getPayment(id: string) {
    return this.call('buscar payment', () => this.payment.get({ id }));
  }

  private async call<T>(action: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.logger.error(`Falha ao ${action} no Mercado Pago: ${error}`);
      throw new BadGatewayException(
        `Falha ao comunicar com o Mercado Pago (${action}).`,
      );
    }
  }
}
