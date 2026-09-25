import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const getPrismaInstance = (): PrismaClient => {
  if (!global.prismaGlobal) {
    const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || env.DATABASE_URL;

    global.prismaGlobal = new PrismaClient({
      datasources: {
        db: {
          url
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }
  return global.prismaGlobal;
};

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const instance = getPrismaInstance();
    const val = Reflect.get(instance, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  }
});
