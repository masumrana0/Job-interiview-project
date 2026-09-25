import fs from 'fs';
import net from 'net';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import EmbeddedPostgres from 'embedded-postgres';

function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  const has5432 = await isPortOpen(5432);
  let activeUrl = process.env.DATABASE_URL;

  if (!has5432 && (!activeUrl || activeUrl.includes('localhost:5432') || activeUrl.includes('127.0.0.1:5432'))) {
    console.log('🐘 External PostgreSQL not detected on 5432. Starting Embedded PostgreSQL on port 5433 for local development...');
    const dbDir = path.resolve(__dirname, '../.pgdata');
    const isInit = fs.existsSync(path.join(dbDir, 'PG_VERSION'));

    const embeddedPg = new EmbeddedPostgres({
      port: 5433,
      databaseDir: dbDir,
      user: 'postgres',
      password: 'password'
    });

    if (!isInit) {
      await embeddedPg.initialise();
    }
    await embeddedPg.start();

    activeUrl = 'postgresql://postgres:password@localhost:5433/postgres?schema=public';
    process.env.DATABASE_URL = activeUrl;

    console.log('🔄 Synchronizing schema with Prisma...');
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: activeUrl },
      stdio: 'inherit'
    });

    const prisma = new PrismaClient({ datasources: { db: { url: activeUrl } } });
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_slot_booking" ON "bookings"("slotId") WHERE "status" = \'active\';'
    );

    // Auto-seed if slots table is empty
    const slotCount = await prisma.slot.count();
    if (slotCount === 0) {
      console.log('🌱 Seeding initial slots...');
      execSync('npx tsx prisma/seed.ts', {
        env: { ...process.env, DATABASE_URL: activeUrl },
        stdio: 'inherit'
      });
    }
    await prisma.$disconnect();

    process.on('SIGINT', async () => {
      await embeddedPg.stop();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await embeddedPg.stop();
      process.exit(0);
    });
  }

  // Import and run server
  await import('../src/server');
}

main().catch((err) => {
  console.error('❌ Failed to start development server:', err);
  process.exit(1);
});
