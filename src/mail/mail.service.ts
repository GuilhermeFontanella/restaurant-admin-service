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
    this.from = config.get<string>('MAIL_FROM', 'Restaurant Admin <no-reply@localhost>');
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:5174');
  }

  async sendOnboardingEmail(params: { to: string; nomeEstabelecimento: string; tenantSlug: string; adminEmail: string; adminSenha: string }): Promise<void> {
    const { to, nomeEstabelecimento, tenantSlug, adminEmail, adminSenha } = params;
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
}
