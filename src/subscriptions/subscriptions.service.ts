import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenServiceClient } from '../kitchen-service-client/kitchen-service-client.service';
import { MailService } from '../mail/mail.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import {
  addPeriodicidade,
  buildOpcoesPeriodicidade,
  type BillingPeriodicidade,
} from './billing-periodicidade';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kitchenServiceClient: KitchenServiceClient,
    private readonly mailService: MailService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly config: ConfigService,
  ) {}

  async activate(restaurantId: string, dto: ActivateSubscriptionDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { subscription: true } });
    if (!restaurant || !restaurant.subscription) {
      throw new NotFoundException('Restaurante ou assinatura não encontrada.');
    }

    const wasSuspended = restaurant.status === 'SUSPENDED';

    const subscription = await this.prisma.subscription.update({
      where: { restaurantId },
      data: {
        planId: dto.planId,
        status: 'ACTIVE',
        subscriptionStartsAt: new Date(),
        currentPeriodEnd: new Date(dto.currentPeriodEnd),
      },
    });

    await this.prisma.restaurant.update({ where: { id: restaurantId }, data: { status: 'ACTIVE' } });

    if (wasSuspended) {
      await this.kitchenServiceClient.setTenantAtivo(restaurant.tenantSlug, true);
    }

    return subscription;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async expireOverdueTrials(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: { status: 'TRIAL', trialEndsAt: { lt: now } },
      include: { restaurant: true },
    });

    for (const subscription of expired) {
      this.logger.log(`Trial expirado para o restaurante ${subscription.restaurant.tenantSlug}, suspendendo acesso.`);
      await this.prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'EXPIRED' } });
      await this.prisma.restaurant.update({ where: { id: subscription.restaurantId }, data: { status: 'SUSPENDED' } });
      try {
        await this.kitchenServiceClient.setTenantAtivo(subscription.restaurant.tenantSlug, false);
      } catch (error) {
        this.logger.error(`Falha ao desativar o tenant ${subscription.restaurant.tenantSlug} no order-manager: ${error}`);
      }
    }
  }

  async getSubscriptionInfo(tenantSlug: string) {
    const restaurant = await this.findRestaurantBySlug(tenantSlug);
    const subscription = restaurant.subscription;
    const plans = await this.prisma.plan.findMany({
      where: { ativo: true },
      orderBy: { preco: 'asc' },
    });
    const availablePlans = plans.map((plan) => ({
      ...plan,
      opcoesPeriodicidade: buildOpcoesPeriodicidade(Number(plan.preco)),
    }));

    return {
      status: subscription?.status ?? null,
      restaurantStatus: restaurant.status,
      currentPlan: subscription?.plan ?? null,
      renewalDate: subscription?.currentPeriodEnd ?? subscription?.trialEndsAt ?? null,
      isTrial: subscription?.status === 'TRIAL',
      availablePlans,
    };
  }

  async createCheckout(
    tenantSlug: string,
    dto: { planId: string; periodicidade?: BillingPeriodicidade },
  ) {
    const restaurant = await this.findRestaurantBySlug(tenantSlug);
    if (!restaurant.subscription) {
      throw new NotFoundException('Assinatura não encontrada para este restaurante.');
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.ativo) {
      throw new NotFoundException('Plano não encontrado.');
    }

    const periodicidade: BillingPeriodicidade = dto.periodicidade ?? 'MENSAL';
    const opcao = buildOpcoesPeriodicidade(Number(plan.preco)).find(
      (o) => o.periodicidade === periodicidade,
    )!;
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5174');
    const payerEmail = restaurant.donoEmail;

    const preapproval = await this.mercadoPagoService.createPreapproval({
      reason: `Assinatura ${plan.nome} (${periodicidade.toLowerCase()}) — ${restaurant.nomeFantasia}`,
      payerEmail,
      transactionAmount: opcao.precoTotal,
      frequency: opcao.meses,
      frequencyType: 'months',
      externalReference: restaurant.subscription.id,
      backUrl: `${appUrl}/admin/configuracoes/conta?checkout=retorno&planId=${plan.id}&periodicidade=${periodicidade}`,
    });

    if (!preapproval.init_point) {
      throw new BadRequestException('Mercado Pago não retornou o link de pagamento.');
    }

    await this.prisma.subscription.update({
      where: { id: restaurant.subscription.id },
      data: {
        planId: plan.id,
        billingPeriodicidade: periodicidade,
        mercadoPagoPreapprovalId: String(preapproval.id),
        mercadoPagoPayerEmail: payerEmail,
      },
    });

    return { checkoutUrl: preapproval.init_point };
  }

  async handlePreapprovalEvent(preapprovalId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { mercadoPagoPreapprovalId: preapprovalId },
      include: { restaurant: true, plan: true },
    });
    if (!subscription) {
      this.logger.warn(`Preapproval ${preapprovalId} não corresponde a nenhuma assinatura.`);
      return;
    }

    const preapproval = await this.mercadoPagoService.getPreapproval(preapprovalId);

    if (preapproval.status === 'authorized' && subscription.plan) {
      await this.confirmPayment(subscription);
    } else if (preapproval.status === 'cancelled') {
      await this.cancelSubscription(subscription);
    }
  }

  async handlePaymentEvent(paymentId: string): Promise<void> {
    const payment = await this.mercadoPagoService.getPayment(paymentId);
    const externalReference = payment.external_reference;
    if (!externalReference) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: externalReference },
      include: { restaurant: true, plan: true },
    });
    if (!subscription) {
      this.logger.warn(`Payment ${paymentId} referencia assinatura desconhecida: ${externalReference}`);
      return;
    }

    if (payment.status === 'approved' && subscription.plan) {
      await this.confirmPayment(subscription);
    } else if (payment.status === 'rejected' && subscription.restaurant.status === 'ACTIVE') {
      this.logger.warn(`Cobrança recusada para o restaurante ${subscription.restaurant.tenantSlug}, marcando como inadimplente.`);
      await this.prisma.restaurant.update({
        where: { id: subscription.restaurantId },
        data: { status: 'PAST_DUE' },
      });
    }
  }

  private async confirmPayment(subscription: {
    id: string;
    restaurantId: string;
    billingPeriodicidade: string | null;
    plan: { id: string; nome: string; periodicidade: string } | null;
    restaurant: { tenantSlug: string; donoEmail: string };
  }): Promise<void> {
    if (!subscription.plan) return;
    const periodicidade = (subscription.billingPeriodicidade as BillingPeriodicidade) ?? 'MENSAL';
    const currentPeriodEnd = addPeriodicidade(new Date(), periodicidade);

    await this.activate(subscription.restaurantId, {
      planId: subscription.plan.id,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    });

    await this.mailService.sendSubscriptionPaymentConfirmedEmail(
      subscription.restaurant.donoEmail,
      subscription.plan.nome,
      currentPeriodEnd,
    );
  }

  private async cancelSubscription(subscription: {
    id: string;
    restaurantId: string;
    restaurant: { tenantSlug: string };
  }): Promise<void> {
    await this.prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'CANCELLED' } });
    await this.prisma.restaurant.update({ where: { id: subscription.restaurantId }, data: { status: 'CANCELLED' } });
    await this.kitchenServiceClient.setTenantAtivo(subscription.restaurant.tenantSlug, false);
  }

  private async findRestaurantBySlug(tenantSlug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { tenantSlug },
      include: { subscription: { include: { plan: true } } },
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado.');
    return restaurant;
  }
}
