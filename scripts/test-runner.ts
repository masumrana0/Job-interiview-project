import fs from 'fs';
import { spawn, execSync } from 'child_process';
import net from 'net';
import path from 'path';
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

async function run() {
  let embeddedPg: any = null;
  let activeDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  const hasExternalPg = await isPortOpen(5432);

  if (!hasExternalPg && (!activeDbUrl || activeDbUrl.includes('localhost:5432') || activeDbUrl.includes('127.0.0.1:5432'))) {
    console.log('🐘 External PostgreSQL not detected on 5432. Launching Embedded PostgreSQL on port 5433 for automated tests...');
    const dbDir = path.resolve(__dirname, '../.pgdata');
    const isInit = fs.existsSync(path.join(dbDir, 'PG_VERSION'));

    embeddedPg = new EmbeddedPostgres({
      port: 5433,
      databaseDir: dbDir,
      user: 'postgres',
      password: 'password'
    });

    if (!isInit) {
      await embeddedPg.initialise();
    }

    await embeddedPg.start();
    console.log('✅ Embedded PostgreSQL started successfully on port 5433.');

    activeDbUrl = 'postgresql://postgres:password@localhost:5433/postgres?schema=public';
    process.env.TEST_DATABASE_URL = activeDbUrl;
    process.env.DATABASE_URL = activeDbUrl;
  } else {
    console.log(`🐘 Using PostgreSQL database at: ${activeDbUrl || 'localhost:5432'}`);
  }

  // Synchronize database schema and ensure partial unique index
  console.log('🔄 Synchronizing PostgreSQL database schema with Prisma...');
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: activeDbUrl },
    stdio: 'inherit'
  });

  const prisma = new PrismaClient({ datasources: { db: { url: activeDbUrl } } });
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_slot_booking" ON "bookings"("slotId") WHERE "status" = \'active\';'
  );
  await prisma.$disconnect();
  console.log('✅ PostgreSQL database schema & partial unique index verified.');

  // Run Jest
  console.log('\n🧪 Running Jest integration test suites...\n');
  const jestBin = path.resolve(__dirname, '../node_modules/.bin/jest');
  const jestArgs = ['--runInBand', '--detectOpenHandles', '--forceExit', ...process.argv.slice(2)];

  const jestProcess = spawn(process.platform === 'win32' ? `${jestBin}.cmd` : jestBin, jestArgs, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: activeDbUrl,
      TEST_DATABASE_URL: activeDbUrl
    }
  });

  jestProcess.on('close', async (exitCode) => {
    if (embeddedPg) {
      console.log('\n🛑 Stopping Embedded PostgreSQL server...');
      try {
        await embeddedPg.stop();
        console.log('✅ Embedded PostgreSQL stopped cleanly.');
      } catch (err) {
        // ignore on exit
      }
    }
    process.exit(exitCode ?? 0);
  });
}

run().catch(async (err) => {
  console.error('❌ Failed to run tests:', err);
  process.exit(1);
});
