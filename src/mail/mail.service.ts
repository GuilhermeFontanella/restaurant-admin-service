import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(config: ConfigService) {
    const port = Number(config.get<string>('SMTP_PORT', '1025'));
    const secure = config.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = config.get<string>('SMTP_USER');
    const password = config.get<string>('SMTP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port,
      secure,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });
    this.from = config.get<string>(
      'MAIL_FROM',
      'Restaurant Admin <no-reply@localhost>',
    );
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:5174');
  }

  async sendOnboardingEmail(params: {
    to: string;
    nomeEstabelecimento: string;
    tenantSlug: string;
    adminEmail: string;
    adminSenha: string;
  }): Promise<void> {
    const { to, nomeEstabelecimento, tenantSlug, adminEmail, adminSenha } =
      params;
    const loginUrl = `${this.appUrl}/${encodeURIComponent(tenantSlug)}/login`;

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Seu acesso ao Order Manager está pronto — ${nomeEstabelecimento}`,
      text:
        `Olá! O cadastro de ${nomeEstabelecimento} foi aprovado.\n\n` +
        `Acesse: ${loginUrl}\n` +
        `Usuário: ${adminEmail}\n` +
        `Senha temporária: ${adminSenha}\n\n` +
        `Você terá 30 dias de teste gratuito a partir de hoje. Ao fazer o primeiro login, será solicitado que você troque a senha.`,
      html:
        `<p>Olá! O cadastro de <strong>${nomeEstabelecimento}</strong> foi aprovado.</p>` +
        `<p><a href="${loginUrl}">Acessar o Order Manager</a></p>` +
        `<p>Usuário: ${adminEmail}<br/>Senha temporária: ${adminSenha}</p>` +
        `<p>Você terá 30 dias de teste gratuito a partir de hoje. Ao fazer o primeiro login, será solicitado que você troque a senha.</p>`,
    });
    this.logger.debug(`Onboarding email sent to ${to}`);
  }

  async sendConfirmationEmail(params: {
    to: string;
    nomeEstabelecimento: string;
    confirmUrl: string;
  }): Promise<void> {
    const { to, nomeEstabelecimento, confirmUrl } = params;

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Confirme o cadastro de ${nomeEstabelecimento}`,
      text:
        `Olá! Recebemos o interesse de ${nomeEstabelecimento} em testar o Order Manager.\n\n` +
        `Para concluir seu cadastro, acesse: ${confirmUrl}\n\n` +
        `Esse link expira em 48 horas.`,
      html:
        `<p>Olá! Recebemos o interesse de <strong>${nomeEstabelecimento}</strong> em testar o Order Manager.</p>` +
        `<p><a href="${confirmUrl}">Concluir cadastro</a></p>` +
        `<p>Esse link expira em 48 horas.</p>`,
    });
    this.logger.debug(`Confirmation email sent to ${to}`);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Redefinição de senha - Restaurant Admin',
      text: `Para redefinir sua senha, acesse: ${resetUrl}\n\nEste link expira em 30 minutos.`,
      html: `<p>Para redefinir sua senha, acesse o link abaixo:</p><p><a href="${resetUrl}">Redefinir minha senha</a></p><p>Este link expira em 30 minutos.</p>`,
    });
    this.logger.debug(`Password reset email sent to ${to}`);
  }

  async sendAccessRemovedEmail(
    to: string,
    nomeEstabelecimento: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Acesso suspenso — ${nomeEstabelecimento}`,
      text: `O acesso de ${nomeEstabelecimento} ao Order Manager foi suspenso. Se isso não era esperado, entre em contato com o suporte.`,
      html: `<p>O acesso de <strong>${nomeEstabelecimento}</strong> ao Order Manager foi suspenso.</p><p>Se isso não era esperado, entre em contato com o suporte.</p>`,
    });
    this.logger.debug(`Access removed email sent to ${to}`);
  }

  async sendAccessRestoredEmail(
    to: string,
    nomeEstabelecimento: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Acesso reativado — ${nomeEstabelecimento}`,
      text: `O acesso de ${nomeEstabelecimento} ao Order Manager foi reativado. Você já pode fazer login normalmente.`,
      html: `<p>O acesso de <strong>${nomeEstabelecimento}</strong> ao Order Manager foi reativado.</p><p>Você já pode fazer login normalmente.</p>`,
    });
    this.logger.debug(`Access restored email sent to ${to}`);
  }

  async sendSubscriptionPaymentConfirmedEmail(
    to: string,
    planNome: string,
    renewalDate: Date,
  ): Promise<void> {
    const renewalDateLabel = renewalDate.toLocaleDateString('pt-BR');
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Pagamento confirmado — plano ${planNome}`,
      text:
        `Recebemos o pagamento da sua assinatura do plano ${planNome}.\n\n` +
        `Sua próxima cobrança será em ${renewalDateLabel}.`,
      html:
        `<p>Recebemos o pagamento da sua assinatura do plano <strong>${planNome}</strong>.</p>` +
        `<p>Sua próxima cobrança será em ${renewalDateLabel}.</p>`,
    });
    this.logger.debug(`Subscription payment confirmed email sent to ${to}`);
  }

  async sendAccountDeletedEmail(
    to: string,
    nomeEstabelecimento: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Conta excluída — ${nomeEstabelecimento}`,
      text: `A conta de ${nomeEstabelecimento} e todos os seus dados foram excluídos permanentemente do Order Manager.`,
      html: `<p>A conta de <strong>${nomeEstabelecimento}</strong> e todos os seus dados foram excluídos permanentemente do Order Manager.</p>`,
    });
    this.logger.debug(`Account deleted email sent to ${to}`);
  }
}
