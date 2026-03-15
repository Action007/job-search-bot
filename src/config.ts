import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Telegram — required
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_CHAT_ID: z.string().min(1, 'TELEGRAM_CHAT_ID is required'),

  // LinkedIn
  LINKEDIN_COOKIES_PATH: z.string().default('./data/cookies/linkedin.json'),

  // Database
  DB_PATH: z.string().default('./data/jobs.db'),

  // Scheduling
  CRON_MORNING: z.string().default('0 9 * * *'),
  CRON_EVENING: z.string().default('0 18 * * *'),

  // Scoring thresholds
  SCORE_HIGH: z.coerce.number().default(70),
  SCORE_MAYBE: z.coerce.number().default(40),

  // Scraping
  MAX_DETAIL_FETCHES: z.coerce.number().default(30),
  MAX_RUN_DURATION_MS: z.coerce.number().default(1_200_000),

  // Deduplication
  DEDUP_WINDOW_DAYS: z.coerce.number().default(14),

  // Development
  DRY_RUN: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  HEADED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
