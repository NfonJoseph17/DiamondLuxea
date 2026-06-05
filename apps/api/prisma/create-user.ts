/**
 * Create or update a user (bcrypt password). Run from apps/api with DATABASE_URL set.
 *
 * Usage:
 *   pnpm prisma:create-user <email> <password> <MANAGER|CASHIER|SALES> [full name]
 *
 * Examples:
 *   pnpm prisma:create-user admin@beverlys.com 'YourSecurePass' MANAGER "Beverlys Admin"
 *   DATABASE_URL="postgresql://..." pnpm prisma:create-user ...
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const [email, password, roleArg, ...nameParts] = process.argv.slice(2);
const fullName = (nameParts.join(' ') || email?.split('@')[0] || 'User').trim();

async function main() {
  if (!email || !password || !roleArg) {
    console.error(
      'Usage: pnpm prisma:create-user <email> <password> <MANAGER|CASHIER|SALES> [full name]\n' +
        'Example: pnpm prisma:create-user admin@example.com \'hunter2\' MANAGER "Site Manager"',
    );
    process.exit(1);
  }

  const r = roleArg.toUpperCase();
  if (r !== 'MANAGER' && r !== 'CASHIER' && r !== 'SALES') {
    console.error('Role must be MANAGER, CASHIER, or SALES');
    process.exit(1);
  }
  const role = r as Role;

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, fullName, role },
    create: { email, passwordHash, fullName, role },
  });

  console.log('OK — user upserted:', { id: user.id, email: user.email, role: user.role, fullName: user.fullName });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
