import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenServiceClient } from '../kitchen-service-client/kitchen-service-client.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kitchenServiceClient: KitchenServiceClient,
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
}
