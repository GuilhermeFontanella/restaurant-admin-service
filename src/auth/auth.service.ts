import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const RESET_TOKEN_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!admin || !admin.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaCorreta = await bcrypt.compare(dto.senha, admin.senha);
    if (!senhaCorreta) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: JwtPayload = { sub: admin.id, email: admin.email };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: admin.id, nome: admin.nome, email: admin.email },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!admin || !admin.ativo) return;

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    const landingUrl = this.config.get<string>(
      'LANDING_APP_URL',
      'http://localhost:5173',
    );
    await this.mailService.sendPasswordResetEmail(
      admin.email,
      `${landingUrl}/admin/redefinir-senha?token=${encodeURIComponent(token)}`,
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const admin = await this.prisma.adminUser.findFirst({
      where: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: { gt: new Date() },
        ativo: true,
      },
    });

    if (!admin) throw new UnauthorizedException('Token inválido ou expirado.');

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        senha: await bcrypt.hash(dto.novaSenha, 10),
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      },
    });
  }

  async me(userId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });
    if (!admin || !admin.ativo) {
      throw new UnauthorizedException();
    }
    return { id: admin.id, nome: admin.nome, email: admin.email };
  }
}
