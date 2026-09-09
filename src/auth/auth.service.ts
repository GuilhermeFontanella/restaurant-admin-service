import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
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

  async me(userId: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: userId } });
    if (!admin || !admin.ativo) {
      throw new UnauthorizedException();
    }
    return { id: admin.id, nome: admin.nome, email: admin.email };
  }
}
