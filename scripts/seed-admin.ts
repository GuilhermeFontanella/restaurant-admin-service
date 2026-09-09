import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const SALT_ROUNDS = 10;

function parseArgs() {
  const args: Record<string, string | boolean> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (match) {
      args[match[1]] = match[2] ?? true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const nome = args.nome as string;
  const email = args.email as string;
  const senha = args.senha as string;

  if (!nome || !email || !senha) {
    console.error('Uso: ts-node scripts/seed-admin.ts --nome="<nome>" --email=<email> --senha=<senha>');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const existente = await prisma.adminUser.findUnique({ where: { email } });
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    const admin = existente
      ? await prisma.adminUser.update({ where: { email }, data: { nome, senha: senhaHash } })
      : await prisma.adminUser.create({ data: { nome, email, senha: senhaHash } });

    console.log(`${existente ? 'Usuário atualizado' : 'Usuário criado'}: ${admin.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
