import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const PLANOS = [
  {
    nome: 'Teste grátis',
    descricao: 'Experimente grátis por 30 dias com todos os recursos do plano Pro — sem cartão de crédito.',
    features: [
      'Equivalente ao plano Pro — mesmos limites e recursos',
      '7 usuários inclusos: 1 gerente, 1 chefe de cozinha, 2 cozinheiros, 1 chefe de balcão e 2 atendentes',
      'Até 30 mesas',
      'Até 30 produtos no cardápio',
      'Controle de estoque em tempo real',
      'Dashboard com o desempenho do negócio ao vivo',
      'Pedidos para viagem (take away)',
      'Sem compromisso, sem cartão de crédito',
    ],
    limiteMesas: 30,
    limiteUsuarios: 7,
    limiteProdutos: 30,
    preco: 0,
    periodicidade: 'MENSAL',
    ativo: true,
    padrao: true,
  },
  {
    nome: 'Básico',
    descricao: 'Para organizar o salão e sair do papel sem complicação.',
    features: [
      '3 usuários inclusos (gerente, cozinha e balcão)',
      'Até 10 mesas',
      'Até 10 produtos no cardápio digital',
    ],
    limiteMesas: 10,
    limiteUsuarios: 3,
    limiteProdutos: 10,
    preco: 189.9,
    periodicidade: 'MENSAL',
    ativo: true,
    padrao: false,
  },
  {
    nome: 'Pro',
    descricao: 'Para equipes completas que querem crescer com controle.',
    features: [
      '7 usuários inclusos: 1 gerente, 1 chefe de cozinha, 2 cozinheiros, 1 chefe de balcão e 2 atendentes',
      'Até 30 mesas',
      'Até 30 produtos no cardápio',
      'Controle de estoque em tempo real',
      'Dashboard com o desempenho do negócio ao vivo',
      'Pedidos para viagem (take away)',
    ],
    limiteMesas: 30,
    limiteUsuarios: 7,
    limiteProdutos: 30,
    preco: 249.9,
    periodicidade: 'MENSAL',
    ativo: true,
    padrao: false,
  },
  {
    nome: 'Premium',
    descricao: 'Para operações de alto volume que não podem parar.',
    features: [
      '10 usuários inclusos: 2 gerentes, 1 chefe de cozinha, 3 cozinheiros, 1 chefe de balcão e 3 atendentes',
      'Cardápio com produtos ilimitados',
      'Até 100 mesas',
      'Controle de estoque em tempo real',
      'Dashboard com o desempenho do negócio ao vivo',
      'Pedidos para viagem (take away)',
      'Entrega em domicílio com entregador próprio',
      'Relatórios personalizados para decisões mais rápidas',
    ],
    limiteMesas: 100,
    limiteUsuarios: 10,
    limiteProdutos: null,
    preco: 549.9,
    periodicidade: 'MENSAL',
    ativo: true,
    padrao: false,
  },
];

// Planos antigos que saíram de linha (substituídos por nomes/ofertas novas acima)
// — desativados em vez de apagados para não quebrar assinaturas já existentes.
const PLANOS_DESCONTINUADOS = ['Basico', 'Intermediário'];

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    for (const dados of PLANOS) {
      const existente = await prisma.plan.findFirst({ where: { nome: dados.nome } });
      const plano = existente
        ? await prisma.plan.update({ where: { id: existente.id }, data: dados })
        : await prisma.plan.create({ data: dados });
      console.log(`${existente ? 'Plano atualizado' : 'Plano criado'}: ${plano.nome} (${plano.id})`);
    }

    for (const nome of PLANOS_DESCONTINUADOS) {
      const existente = await prisma.plan.findFirst({ where: { nome } });
      if (existente && existente.ativo) {
        await prisma.plan.update({ where: { id: existente.id }, data: { ativo: false } });
        console.log(`Plano descontinuado desativado: ${nome} (${existente.id})`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
