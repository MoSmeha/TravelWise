// Usage: npx tsx prisma/seed-admin.ts
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { hash } from 'argon2';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;
  const name = process.env.ADMIN_NAME!;
  const username = 'admin';

  const passwordHash = await hash(password);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=200`;

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      username,
      avatarUrl,
      emailVerified: true,
      isAdmin: true,
    },
  });

  console.log(`Admin user created successfully!`);
  console.log(`Email: ${admin.email}`);
  console.log(`Username: ${admin.username}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
