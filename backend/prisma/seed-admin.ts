/**
 * Seed Admin User
 * Creates an initial admin user for the dashboard
 * 
 * Usage: npx tsx prisma/seed-admin.ts
 * 
 * Environment variables:
 * - ADMIN_EMAIL: Admin email (default: admin@travelwise.com)
 * - ADMIN_PASSWORD: Admin password (default: admin123456)
 * - ADMIN_NAME: Admin display name (default: Admin)
 */

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
  const email = process.env.ADMIN_EMAIL || 'admin@travelwise.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const name = process.env.ADMIN_NAME || 'Admin';
  const username = 'admin';

  console.log(`[Seed] Creating admin user: ${email}`);

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    if (existing.isAdmin) {
      console.log('[Seed] Admin user already exists and has admin privileges.');
    } else {
      // Promote to admin
      await prisma.user.update({
        where: { email },
        data: { isAdmin: true },
      });
      console.log('[Seed] Existing user promoted to admin.');
    }
    return;
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) {
    // Username taken, just promote that user to admin
    await prisma.user.update({
      where: { username },
      data: { isAdmin: true },
    });
    console.log(`[Seed] User with username '${username}' promoted to admin.`);
    return;
  }

  // Hash password
  const passwordHash = await hash(password);

  // Generate avatar URL
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=200`;

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      username,
      avatarUrl,
      emailVerified: true, // Admin email is pre-verified
      isAdmin: true,
    },
  });

  console.log(`[Seed] Admin user created successfully!`);
  console.log(`[Seed] Email: ${admin.email}`);
  console.log(`[Seed] Username: ${admin.username}`);
  console.log(`[Seed] Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
