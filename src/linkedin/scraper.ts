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
  // Wait to ensure the page is focused
  await delay(1000, 2000);

  const containerKeys = [
    '[data-testid="lazy-column"]',
    '.jobs-search-results-list',
    '.scaffold-layout__list'
  ];

  const listSelector = containerKeys.join(', ');
  try {
    const listElement = await page.waitForSelector(listSelector, { timeout: 5000 });
    if (listElement) {
      // Hover over the list container to ensure hardware wheel events target it
      await listElement.hover();
      
      // Click slightly inside the bounding box so 'PageDown' keypresses work
      const box = await listElement.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  } catch (e) {
    // If we can't find it, fallback to hovering the left side (25%) of the screen 
    // where the job list usually resides. Center (50%) targets the right-side detail pane!
    const viewportSize = page.viewportSize();
    if (viewportSize) {
      await page.mouse.move(viewportSize.width * 0.25, viewportSize.height / 2);
      await page.mouse.click(viewportSize.width * 0.25, viewportSize.height / 2);
    }
  }

  // Increased to 15 scroll cycles to load enough pages for ~60 jobs
  for (let i = 0; i < 15; i++) {
    // 1. First, send a native OS-level hardware wheel scroll
    // This perfectly bypasses React CSS-module container obfuscation
    await page.mouse.wheel(0, 800);
    
    // Send PageDown to assist if the scrollable container is focused
    await page.keyboard.press('PageDown');
    
    // 2. Also try standard window/container scrolling
    await page.evaluate((keys) => {
      window.scrollBy(0, 800);
      
      // Fallback for known containers if they exist
      for (const sel of keys) {
        const el = document.querySelector(sel);
        if (el) el.scrollBy(0, 800);
      }
      
      // Nuclear fallback: find and scroll any DOM element with an active overflow 
      // This is especially useful for nested React Native Web <ScrollView> wrappers
      document.querySelectorAll('*').forEach(node => {
        try {
          const style = window.getComputedStyle(node);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            node.scrollBy(0, 800);
          }
        } catch {
          // ignore potential detached node errors
        }
      });
    }, containerKeys);
    
    // Give the React lazy-loader time to fetch the JSON payload
    await delay(1000, 1800);
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
    // 1. Classic structural layout parsing
    if (document.querySelector(sel.jobCard)) {
      return Array.from(document.querySelectorAll(sel.jobCard))
        .slice(0, 60)
        .map((card) => ({
          title: card.querySelector(sel.title)?.textContent?.trim() ?? null,
          company: card.querySelector(sel.company)?.textContent?.trim() ?? null,
          location: card.querySelector(sel.location)?.textContent?.trim() ?? null,
          url: (card.querySelector(sel.link) as HTMLAnchorElement)?.href ?? null,
          posted_at: card.querySelector(sel.time)?.getAttribute('datetime') ?? null,
          description: null,
        }));
    }

    // 2. React UI obfuscated layout fallback
    // We look for any button/card containing a "JobImpressionEventV2" or "FlagshipSearchServedEvent"
    const cards = Array.from(document.querySelectorAll('div[data-view-tracking-scope*="JobImpressionEventV2"], div[data-view-tracking-scope*="FlagshipSearchServedEvent"]'));
    
    const parsed: RawLinkedInJob[] = [];
    const seenIds = new Set<string>();

    for (const card of cards) {
      const html = card.innerHTML;
      
      // Extract Job ID from URIs like urn:li:fs_normalized_jobPosting:12345
      const urnMatch = html.match(/urn:li:fs_normalized_jobPosting:(\d+)/);
      if (!urnMatch) continue;
      
      const jobId = urnMatch[1];
      if (seenIds.has(jobId)) continue;
      seenIds.add(jobId);

      const url = `https://www.linkedin.com/jobs/view/${jobId}/`;
      
      // In the new layout, core details are often just sequenced <p> tags
      const pTags = Array.from(card.querySelectorAll('p')).map(p => p.textContent?.trim() ?? '');
      
      // Remove empty tags or things like "·"
      const validText = pTags.filter(t => t.length > 2 && !t.includes('Be an early applicant'));
      
      // Heuristic:
      // validText[0] -> Title (e.g. "Software Engineer I - Junior Level")
      // validText[1] -> Company (e.g. "Mercor")
      // validText[2] -> Location (e.g. "Germany (Remote)")
      // Or if verified badges mess up the DOM, we can rely on image alt texts for company
      const img = card.querySelector('img');
      let companyFallback = img ? img.getAttribute('alt')?.trim() : null;
      if (!companyFallback && validText[1]) companyFallback = validText[1];

      parsed.push({
        title: validText[0] || 'Unknown Title',
        company: companyFallback || 'Unknown Company',
        location: validText[1] !== companyFallback ? validText[2] || validText[1] : validText[2] || 'Unknown Location',
        url,
        posted_at: new Date().toISOString(), // Fallback if time tag is deeply obscured
        description: null,
      });

      if (parsed.length >= 60) break;
    }

    return parsed;
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
      logger.info({ url: job.url }, 'hydrated full description');
      fetchCount++;
    } catch {
      logger.debug({ url: job.url }, 'failed to fetch description, skipping');
    }
  }

  await browser.close();
}
