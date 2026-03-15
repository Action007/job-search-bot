import { chromium, Page } from 'playwright';
import { readFileSync } from 'fs';
import { config } from '../config';
import { SEARCH_QUERIES, SELECTORS } from './constants';
import { RawLinkedInJob } from '../types';
import { logger } from '../utils/logger';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

async function delay(min: number, max: number): Promise<void> {
  await new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

async function createContextAndPage(browser: any, cookies: any[]) {
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1366, height: 768 },
  });
  await ctx.addCookies(cookies);

  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return { ctx, page };
}

async function scroll(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(
      () => window.scrollBy(0, 300 + Math.random() * 200)
    );
    await delay(400, 900);
  }
}

async function isBlocked(page: Page): Promise<boolean> {
  const url = page.url();
  if (/checkpoint|authwall|challenge/.test(url)) return true;
  const title = await page.title();
  return /security verification|quick security check/i.test(title);
}

function buildUrl(keywords: string, location: string): string {
  return (
    'https://www.linkedin.com/jobs/search/?' +
    new URLSearchParams({
      keywords,
      location,
      f_WT: '2',
      f_TPR: 'r86400',
      sortBy: 'DD',
    })
  );
}

async function extractCards(page: Page): Promise<RawLinkedInJob[]> {
  return page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel.jobCard))
      .slice(0, 25)
      .map((card) => ({
        title: card.querySelector(sel.title)?.textContent?.trim() ?? null,
        company:
          card.querySelector(sel.company)?.textContent?.trim() ?? null,
        location:
          card.querySelector(sel.location)?.textContent?.trim() ?? null,
        url:
          (card.querySelector(sel.link) as HTMLAnchorElement)?.href ?? null,
        posted_at:
          card.querySelector(sel.time)?.getAttribute('datetime') ?? null,
        description: null,
      }));
  }, SELECTORS);
}

export async function runScraper(runId: string): Promise<RawLinkedInJob[]> {
  const cookies = JSON.parse(
    readFileSync(config.LINKEDIN_COOKIES_PATH, 'utf-8')
  );

  const browser = await chromium.launch({
    headless: !config.HEADED,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const { page } = await createContextAndPage(browser, cookies);

  const all: RawLinkedInJob[] = [];

  for (const q of SEARCH_QUERIES) {
    try {
      await page.goto(buildUrl(q.keywords, q.location), {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      if (await isBlocked(page)) {
        await browser.close();
        throw new Error('LINKEDIN_BLOCKED');
      }

      await scroll(page);

      await page
        .waitForSelector(SELECTORS.jobCard, { timeout: 10_000 })
        .catch(() => null);

      const jobs = await extractCards(page);
      logger.info(
        { runId, query: q.keywords, location: q.location, count: jobs.length },
        'query done'
      );
      all.push(...jobs);

      await delay(4_000, 8_000);
    } catch (err: any) {
      if (err.message === 'LINKEDIN_BLOCKED') throw err;
      logger.warn(
        { query: q.keywords, err: err.message },
        'query failed, continuing'
      );
    }
  }

  await browser.close();
  return all;
}

export async function enrichWithDescriptions(
  jobs: import('../types').NormalizedJob[],
  maxFetches: number = 45
): Promise<void> {
  const cookies = JSON.parse(
    readFileSync(config.LINKEDIN_COOKIES_PATH, 'utf-8')
  );

  const browser = await chromium.launch({
    headless: !config.HEADED,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const { page } = await createContextAndPage(browser, cookies);

  let fetchCount = 0;
  for (const job of jobs) {
    if (fetchCount >= maxFetches) break;
    if (!job.url || job.description !== null) continue; // Skip if no URL or already has description

    try {
      await page.goto(job.url, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      await delay(2_000, 4_000);
      
      const desc = await page
        .locator(SELECTORS.description)
        .first()
        .textContent({ timeout: 5_000 })
        .catch(() => null);
        
      if (desc) {
         // Perform HTML stripping manually inside string scope to decouple from generic parser logic
        job.description = desc
           .replace(/<br\s*\/?>/gi, '\n')
           .replace(/<\/p>/gi, '\n')
           .replace(/<[^>]+>/g, ' ')
           .replace(/&nbsp;/g, ' ')
           .replace(/&amp;/g, '&')
           .replace(/\s+/g, ' ')
           .trim()
           .slice(0, 5_000);
      }
      logger.debug({ url: job.url }, 'fetched description');
      fetchCount++;
    } catch {
      logger.debug({ url: job.url }, 'failed to fetch description, skipping');
    }
  }

  await browser.close();
}
