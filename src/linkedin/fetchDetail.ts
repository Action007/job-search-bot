import { Page } from 'playwright';
import { SELECTORS } from './constants';
import { RawLinkedInJob } from '../types';
import { logger } from '../utils/logger';

// Optional Day 2 add-on.
// Only enable after card-only scraping works end-to-end.
// Adds ~5–10 minutes to run time. Capped at `max` fetches.

export async function fetchDescriptions(
  page: Page,
  jobs: RawLinkedInJob[],
  max = 30
): Promise<void> {
  for (const job of jobs.slice(0, max)) {
    if (!job.url) continue;
    try {
      await page.goto(job.url, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      await new Promise((r) =>
        setTimeout(r, 2_000 + Math.random() * 2_000)
      );
      job.description = await page
        .locator(SELECTORS.description)
        .first()
        .textContent({ timeout: 5_000 })
        .then((t) => t?.replace(/\s+/g, ' ').trim().slice(0, 5_000) ?? null)
        .catch(() => null);

      logger.debug({ url: job.url }, 'fetched description');
    } catch {
      logger.debug({ url: job.url }, 'failed to fetch description, skipping');
    }
  }
}
