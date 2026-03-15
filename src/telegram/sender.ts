import { config } from '../config';
import { TelegramDigestItem, RunStats } from '../types';
import { formatDigest, splitMessages } from './formatter';
import { logger } from '../utils/logger';

const API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

async function post(text: string): Promise<boolean> {
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
  const data = (await res.json()) as any;
  return data.ok;
}

export async function sendMessage(
  text: string,
  retries = 3
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    if (await post(text)) return;
    logger.warn({ attempt: i + 1 }, 'Telegram send failed, retrying');
    await new Promise((r) => setTimeout(r, 2000));
  }
  logger.error('Telegram send failed after all retries');
}

export async function sendAlert(text: string): Promise<void> {
  await sendMessage(text);
}

export async function sendDigest(
  jobs: TelegramDigestItem[],
  stats: RunStats
): Promise<void> {
  const full = formatDigest(jobs, stats);
  for (const chunk of splitMessages(full)) {
    await sendMessage(chunk);
    await new Promise((r) => setTimeout(r, 500));
  }
}
