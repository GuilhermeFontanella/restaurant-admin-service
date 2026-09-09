import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { KitchenServiceClient } from '../kitchen-service-client/kitchen-service-client.service';
import { slugify } from '../common/slug.util';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ApproveLeadDto } from './dto/approve-lead.dto';
import { RejectLeadDto } from './dto/reject-lead.dto';

const TRIAL_DAYS = 30;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly kitchenServiceClient: KitchenServiceClient,
  ) {}

  create(dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: dto });
  }

  findAll() {
    return this.prisma.lead.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead não encontrado.');
    return lead;
  }

  async approve(id: string, dto: ApproveLeadDto) {
    const lead = await this.findOne(id);
    if (lead.status !== 'PENDING') {
      throw new ConflictException('Este lead já foi respondido.');
    }
    if (!lead.cnpj) {
      throw new BadRequestException('Não é possível aprovar um lead sem CNPJ. Atualize o cadastro antes de aprovar.');
    }

    const tenantSlug = await this.generateUniqueSlug(lead.nomeEstabelecimento);
    const adminEmail = lead.emailContato;
    const adminSenha = randomBytes(9).toString('base64url');
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { restaurant } = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          nomeFantasia: lead.nomeEstabelecimento,
          cnpj: lead.cnpj!,
          donoNome: lead.nomeDono,
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
          planId: dto.planId,
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
      await this.prisma.subscription.delete({ where: { restaurantId: restaurant.id } });
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

    await this.prisma.lead.update({ where: { id: lead.id }, data: { status: 'APPROVED', respondidoEm: now } });

    return this.prisma.restaurant.findUnique({ where: { id: restaurant.id }, include: { subscription: true } });
  }

  async reject(id: string, dto: RejectLeadDto) {
    const lead = await this.findOne(id);
    if (lead.status !== 'PENDING') {
      throw new ConflictException('Este lead já foi respondido.');
    }
    return this.prisma.lead.update({
      where: { id },
      data: { status: 'REJECTED', motivoRejeicao: dto.motivo, respondidoEm: new Date() },
    });
  }

  private async generateUniqueSlug(nome: string): Promise<string> {
    const base = slugify(nome) || 'restaurante';
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.restaurant.findUnique({ where: { tenantSlug: candidate } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}
