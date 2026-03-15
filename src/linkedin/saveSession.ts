import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const COOKIES_PATH =
  process.env.LINKEDIN_COOKIES_PATH ?? './data/cookies/linkedin.json';

async function saveSession() {
  // Ensure directory exists
  mkdirSync(dirname(COOKIES_PATH), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
  });

  const page = await ctx.newPage();
  await page.goto('https://www.linkedin.com/login');

  console.log('Log in manually. Press Enter when done...');
  await new Promise<void>((resolve) =>
    process.stdin.once('data', () => resolve())
  );

  const cookies = await ctx.cookies();
  writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  console.log(`Cookies saved to ${COOKIES_PATH}`);

  await browser.close();
}

saveSession().catch(console.error);
