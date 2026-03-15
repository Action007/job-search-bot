import { statSync } from 'fs';
import { logger } from '../utils/logger';
import { sendAlert } from '../telegram/sender';

export async function checkCookieAge(cookiePath: string): Promise<void> {
  try {
    const ageDays = (Date.now() - statSync(cookiePath).mtimeMs) / 86_400_000;
    logger.info({ ageDays: Math.floor(ageDays) }, 'Cookie file age check');
    if (ageDays > 25) {
      await sendAlert(
        `⚠️ LinkedIn session is ${Math.floor(ageDays)} days old.\nRe-auth: npx ts-node src/linkedin/saveSession.ts`
      );
    }
  } catch {
    await sendAlert(
      '⚠️ LinkedIn cookie file not found. Run saveSession.ts first.'
    );
  }
}
