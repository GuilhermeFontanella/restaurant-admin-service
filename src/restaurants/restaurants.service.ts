import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.restaurant.findMany({
      include: { subscription: { include: { plan: true } } },
      orderBy: { criadoEm: 'desc' },
    });
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
}
