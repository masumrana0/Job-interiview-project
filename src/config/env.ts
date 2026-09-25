import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z
    .string()
    .default(
      process.env.TEST_DATABASE_URL ||
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/appointment_db?schema=public'
    )
});

export type EnvConfig = z.infer<typeof envSchema>;

let envConfig: EnvConfig;

try {
  envConfig = envSchema.parse(process.env);
  if (process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL) {
    envConfig.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:', error.errors);
  } else {
    console.error('❌ Environment configuration error:', error);
  }
  process.exit(1);
}

process.env.DATABASE_URL = envConfig.DATABASE_URL;

export const env = envConfig;
