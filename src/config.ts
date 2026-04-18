import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_CHAT_ID: z.string().min(1, 'TELEGRAM_CHAT_ID is required'),
  LINKEDIN_COOKIES_PATH: z.string().default('./data/cookies/linkedin.json'),
  DB_PATH: z.string().default('./data/jobs.db'),
  CRON_MORNING: z.string().default('0 9 * * *'),
  CRON_EVENING: z.string().default('0 18 * * *'),
  SCORE_HIGH: z.coerce.number().default(65),
  SCORE_MAYBE: z.coerce.number().default(45),
  MAX_DETAIL_FETCHES: z.coerce.number().default(30),
  MAX_RUN_DURATION_MS: z.coerce.number().default(1_200_000),
  LINKEDIN_POSTED_WITHIN: z.string().default('r86400'),
  DEDUP_WINDOW_DAYS: z.coerce.number().default(14),
  DRY_RUN: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  HEADED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z.string().default('info'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_API_URL: z.string().default('https://api.openai.com/v1'),
  LLM_MODEL: z.string().default('gpt-5-nano'),
  MAX_LLM_EVALS_PER_RUN: z.coerce.number().default(45),
});
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
