import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { KitchenServiceClient } from '../kitchen-service-client/kitchen-service-client.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

export const DELETION_COOLDOWN_MONTHS = 3;
const EXPIRING_SOON_DAYS = 15;

export function computeDeletionEligibleAt(
  subscription: { currentPeriodEnd: Date | null; trialEndsAt: Date } | null,
): Date | null {
  const referenceDate =
    subscription?.currentPeriodEnd ?? subscription?.trialEndsAt;
  if (!referenceDate) return null;
  const eligibleAt = new Date(referenceDate);
  eligibleAt.setMonth(eligibleAt.getMonth() + DELETION_COOLDOWN_MONTHS);
  return eligibleAt;
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly kitchenServiceClient: KitchenServiceClient,
  ) {}

  async findAll() {
    const restaurants = await this.prisma.restaurant.findMany({
      include: { subscription: { include: { plan: true } } },
      orderBy: { criadoEm: 'desc' },
    });
    return restaurants.map((restaurant) => ({
      ...restaurant,
      exclusaoLiberadaEm: computeDeletionEligibleAt(restaurant.subscription),
    }));
  }

  async getStats() {
    const restaurants = await this.prisma.restaurant.findMany({
      include: { subscription: { include: { plan: true } } },
    });

    const now = new Date();
    const soonThreshold = new Date(
      now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000,
    );

    let activeCount = 0;
    let expiringSoonCount = 0;
    let inactiveCount = 0;
    let monthlyRevenue = 0;

    for (const restaurant of restaurants) {
      const subscription = restaurant.subscription;
      if (!subscription) continue;

      if (subscription.status === 'ACTIVE') {
        activeCount += 1;
        monthlyRevenue += Number(subscription.plan?.preco ?? 0);
      }

      if (
        subscription.status === 'EXPIRED' ||
        subscription.status === 'CANCELLED' ||
        restaurant.status === 'SUSPENDED'
      ) {
        inactiveCount += 1;
      }

      const referenceEnd =
        subscription.status === 'ACTIVE'
          ? subscription.currentPeriodEnd
          : subscription.status === 'TRIAL'
            ? subscription.trialEndsAt
            : null;
      if (referenceEnd && referenceEnd > now && referenceEnd <= soonThreshold) {
        expiringSoonCount += 1;
      }
    }

    const pendingApproval = await this.prisma.lead.count({
      where: { status: 'PENDING' },
    });

    return {
      activeCount,
      pendingApproval,
      expiringSoonCount,
      inactiveCount,
      monthlyRevenue,
    };
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { subscription: { include: { plan: true } }, lead: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado.');
    return restaurant;
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    await this.findOne(id);
    return this.prisma.restaurant.update({ where: { id }, data: dto });
  }

  async suspend(id: string) {
    const restaurant = await this.findOne(id);
    await this.kitchenServiceClient.setTenantAtivo(
      restaurant.tenantSlug,
      false,
    );
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
    await this.mailService.sendAccessRemovedEmail(
      restaurant.donoEmail,
      restaurant.nomeFantasia,
    );
    return updated;
  }

  async reactivate(id: string) {
    const restaurant = await this.findOne(id);
    await this.kitchenServiceClient.setTenantAtivo(restaurant.tenantSlug, true);
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    await this.mailService.sendAccessRestoredEmail(
      restaurant.donoEmail,
      restaurant.nomeFantasia,
    );
    return updated;
  }

  async remove(id: string) {
    const restaurant = await this.findOne(id);

    const eligibleAt = computeDeletionEligibleAt(restaurant.subscription);
    if (!eligibleAt || eligibleAt > new Date()) {
      throw new BadRequestException(
        eligibleAt
          ? `Este restaurante só pode ser excluído a partir de ${eligibleAt.toLocaleDateString('pt-BR')} (3 meses após o fim do último ciclo pago).`
          : 'Não foi possível determinar a data de elegibilidade para exclusão.',
      );
    }

    await this.kitchenServiceClient.deleteTenant(restaurant.tenantSlug);
    await this.prisma.$transaction([
      this.prisma.subscription.deleteMany({ where: { restaurantId: id } }),
      this.prisma.restaurant.delete({ where: { id } }),
    ]);
    await this.mailService.sendAccountDeletedEmail(
      restaurant.donoEmail,
      restaurant.nomeFantasia,
    );
  }
}
