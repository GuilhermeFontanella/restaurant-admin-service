import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { KitchenServiceClient } from '../kitchen-service-client/kitchen-service-client.service';
import { slugify } from '../common/slug.util';
import { decrypt, encrypt } from '../common/crypto.util';
import { computeDeletionEligibleAt } from '../restaurants/restaurants.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CompleteLeadDto } from './dto/complete-lead.dto';
import { ApproveLeadDto } from './dto/approve-lead.dto';
import { RejectLeadDto } from './dto/reject-lead.dto';
import { FindLeadsQueryDto } from './dto/find-leads-query.dto';

const TRIAL_DAYS = 30;
const CONFIRMATION_TOKEN_TTL_HOURS = 48;

@Injectable()
export class LeadsService {
  private readonly leadSecretKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly kitchenServiceClient: KitchenServiceClient,
    private readonly config: ConfigService,
  ) {
    this.leadSecretKey = this.config.get<string>(
      'LEAD_SECRET_KEY',
      'change-me-in-production',
    );
  }

  async create(dto: CreateLeadDto) {
    const confirmationToken = randomBytes(32).toString('base64url');
    const confirmationTokenExpiresAt = new Date(
      Date.now() + CONFIRMATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    const lead = await this.prisma.lead.create({
      data: { ...dto, confirmationToken, confirmationTokenExpiresAt },
    });

    const landingUrl = this.config.get<string>(
      'LANDING_APP_URL',
      'http://localhost:5173',
    );
    await this.mailService.sendConfirmationEmail({
      to: lead.emailContato,
      nomeEstabelecimento: lead.nomeEstabelecimento,
      confirmUrl: `${landingUrl}/cadastro/confirmar/${confirmationToken}`,
    });

    return lead;
  }

  async findAll(query: FindLeadsQueryDto = {}) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.uf) where.uf = query.uf;
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { nomeEstabelecimento: { contains: term, mode: 'insensitive' } },
        { nomeDono: { contains: term, mode: 'insensitive' } },
        { emailContato: { contains: term, mode: 'insensitive' } },
        { telefoneContato: { contains: term, mode: 'insensitive' } },
        { cnpj: { contains: term, mode: 'insensitive' } },
      ];
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        restaurant: { include: { subscription: { include: { plan: true } } } },
      },
    });

    const enriched = leads.map((lead) => this.withDeletionEligibility(lead));

    const pending = enriched
      .filter((lead) => lead.status === 'PENDING')
      .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
    const rest = enriched
      .filter((lead) => lead.status !== 'PENDING')
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

    const sorted = [...pending, ...rest];

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return { items, total: sorted.length, page, pageSize };
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        restaurant: { include: { subscription: { include: { plan: true } } } },
      },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado.');
    return this.withDeletionEligibility(lead);
  }

  private withDeletionEligibility<
    T extends {
      restaurant: {
        subscription: {
          currentPeriodEnd: Date | null;
          trialEndsAt: Date;
        } | null;
      } | null;
    },
  >(lead: T) {
    if (!lead.restaurant) return lead;
    return {
      ...lead,
      restaurant: {
        ...lead.restaurant,
        exclusaoLiberadaEm: computeDeletionEligibleAt(
          lead.restaurant.subscription,
        ),
      },
    };
  }

  async findByToken(token: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { confirmationToken: token },
    });
    if (!lead || lead.status !== 'AWAITING_CONFIRMATION') {
      throw new NotFoundException('Link de confirmação inválido.');
    }
    if (
      !lead.confirmationTokenExpiresAt ||
      lead.confirmationTokenExpiresAt < new Date()
    ) {
      throw new GoneException('Link de confirmação expirado.');
    }
    return {
      nomeEstabelecimento: lead.nomeEstabelecimento,
      emailContato: lead.emailContato,
    };
  }

  async complete(token: string, dto: CompleteLeadDto) {
    const lead = await this.prisma.lead.findUnique({
      where: { confirmationToken: token },
    });
    if (!lead || lead.status !== 'AWAITING_CONFIRMATION') {
      throw new NotFoundException('Link de confirmação inválido.');
    }
    if (
      !lead.confirmationTokenExpiresAt ||
      lead.confirmationTokenExpiresAt < new Date()
    ) {
      throw new GoneException('Link de confirmação expirado.');
    }

    let planoInteresseId = dto.planoInteresseId;
    if (!planoInteresseId) {
      const defaultPlan = await this.prisma.plan.findFirst({
        where: { padrao: true },
      });
      planoInteresseId = defaultPlan?.id;
    }

    return this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        nomeDono: dto.nomeDono,
        cnpj: dto.cnpj,
        endereco: dto.endereco,
        cidade: dto.cidade,
        uf: dto.uf,
        planoInteresseId,
        senhaCriptografada: encrypt(dto.senha, this.leadSecretKey),
        status: 'PENDING',
        emailConfirmadoEm: new Date(),
        confirmationToken: null,
        confirmationTokenExpiresAt: null,
      },
    });
  }

  async approve(id: string, dto: ApproveLeadDto) {
    const lead = await this.findOne(id);
    if (lead.status !== 'PENDING') {
      throw new ConflictException('Este lead já foi respondido.');
    }
    if (!lead.cnpj || !lead.nomeDono) {
      throw new BadRequestException(
        'Não é possível aprovar um lead sem CNPJ. Atualize o cadastro antes de aprovar.',
      );
    }

    const existingByCnpj = await this.prisma.restaurant.findUnique({
      where: { cnpj: lead.cnpj },
    });
    if (existingByCnpj) {
      throw new ConflictException(
        'Já existe um restaurante cadastrado com este CNPJ.',
      );
    }

    const tenantSlug = await this.generateUniqueSlug(lead.nomeEstabelecimento);
    const adminEmail = lead.emailContato;
    const adminSenha = lead.senhaCriptografada
      ? decrypt(lead.senhaCriptografada, this.leadSecretKey)
      : randomBytes(9).toString('base64url');
    const now = new Date();
    const trialEndsAt = new Date(
      now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );

    const { restaurant } = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          nomeFantasia: lead.nomeEstabelecimento,
          cnpj: lead.cnpj!,
          donoNome: lead.nomeDono!,
          donoEmail: lead.emailContato,
          donoTelefone: lead.telefoneContato,
          contatoNome: lead.nomeDono,
          contatoEmail: lead.emailContato,
          contatoTelefone: lead.telefoneContato,
          cidade: lead.cidade,
          uf: lead.uf,
          tenantSlug,
          status: 'TRIAL',
          leadId: lead.id,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          restaurantId: restaurant.id,
          planId: dto.planId ?? lead.planoInteresseId,
          status: 'TRIAL',
          trialStartsAt: now,
          trialEndsAt,
        },
      });

      return { restaurant, subscription };
    });

    try {
      await this.kitchenServiceClient.createTenant({
        slug: tenantSlug,
        nome: lead.nomeEstabelecimento,
        adminEmail,
        adminSenha,
      });
    } catch (error) {
      await this.prisma.subscription.delete({
        where: { restaurantId: restaurant.id },
      });
      await this.prisma.restaurant.delete({ where: { id: restaurant.id } });
      throw error;
    }

    await this.mailService.sendOnboardingEmail({
      to: adminEmail,
      nomeEstabelecimento: lead.nomeEstabelecimento,
      tenantSlug,
      adminEmail,
      adminSenha,
    });

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'APPROVED', respondidoEm: now },
    });

    return this.prisma.restaurant.findUnique({
      where: { id: restaurant.id },
      include: { subscription: true },
    });
  }

  async reject(id: string, dto: RejectLeadDto) {
    const lead = await this.findOne(id);
    if (lead.status !== 'PENDING') {
      throw new ConflictException('Este lead já foi respondido.');
    }
    return this.prisma.lead.update({
      where: { id },
      data: {
        status: 'REJECTED',
        motivoRejeicao: dto.motivo,
        respondidoEm: new Date(),
      },
    });
  }

  private async generateUniqueSlug(nome: string): Promise<string> {
    const base = slugify(nome) || 'restaurante';
    let candidate = base;
    let suffix = 1;
    while (
      await this.prisma.restaurant.findUnique({
        where: { tenantSlug: candidate },
      })
    ) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}
