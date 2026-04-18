import { chromium, Page } from 'playwright';
import { appendFileSync, mkdirSync, readFileSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config';
import { SEARCH_QUERIES, SELECTORS } from './constants';
import { RawLinkedInJob, SearchQuery } from '../types';
import { logger } from '../utils/logger';
import { stripHtml } from '../parsing/normalize';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const QUERY_LOG_PATH = './data/query-results.jsonl';
const MAX_SCROLL_CYCLES = 10;
const MAX_PAGINATION_PAGES = 10;
const PAGINATION_LIST_SELECTOR = 'ul[data-testid="pagination-controls-list"]';

type ResultsPaneDebug = {
  jobCardCount: number;
  dismissButtonCount: number;
  jobLinkCount: number;
  impressionCardCount: number;
  visibleJobIdsSample: string[];
  scrollHeights: number[];
};

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
      await listElement.hover();

      const box = await listElement.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  } catch (e) {
    const viewportSize = page.viewportSize();
    if (viewportSize) {
      await page.mouse.move(viewportSize.width * 0.25, viewportSize.height / 2);
      await page.mouse.click(viewportSize.width * 0.25, viewportSize.height / 2);
    }
  }

  for (let i = 0; i < MAX_SCROLL_CYCLES; i++) {
    await page.mouse.wheel(0, 800);
    await page.keyboard.press('PageDown');

    await page.evaluate((keys) => {
      window.scrollBy(0, 800);

      for (const sel of keys) {
        const el = document.querySelector(sel);
        if (el) el.scrollBy(0, 800);
      }

      document.querySelectorAll('*').forEach(node => {
        try {
          const style = window.getComputedStyle(node);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            node.scrollBy(0, 800);
          }
        } catch {
        }
      });
    }, containerKeys);

    await delay(1000, 1800);
  }
}

async function getResultsPaneDebug(page: Page): Promise<ResultsPaneDebug> {
  return page.evaluate(() => {
    const visibleJobIdsSample = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]')
    )
      .map((a) => a.getAttribute('href') ?? '')
      .map((href) => {
        const match = href.match(/\/jobs\/view\/(\d+)/);
        return match ? match[1] : null;
      })
      .filter((id): id is string => !!id)
      .slice(0, 10);

    const scrollHeights = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid="lazy-column"], .jobs-search-results-list, .scaffold-layout__list'
      )
    )
      .map((el) => el.scrollHeight)
      .filter((value) => Number.isFinite(value))
      .slice(0, 5);

    return {
      jobCardCount: document.querySelectorAll('.job-card-container').length,
      dismissButtonCount: document.querySelectorAll('button[aria-label^="Dismiss "]').length,
      jobLinkCount: document.querySelectorAll('a[href*="/jobs/view/"]').length,
      impressionCardCount: document.querySelectorAll(
        'div[data-view-tracking-scope*="JobImpressionEventV2"], div[data-view-tracking-scope*="FlagshipSearchServedEvent"]'
      ).length,
      visibleJobIdsSample,
      scrollHeights,
    };
  });
}

async function getPageFingerprint(page: Page): Promise<string> {
  return page.evaluate(() => {
    const activePage =
      (
        document.querySelector(
          '[data-testid^="pagination-indicator-"][aria-current="true"], [aria-current="true"][aria-label^="Page "]'
        ) as HTMLElement | null
      )?.getAttribute('aria-label') ??
      (
        document.querySelector(
          '[data-testid^="pagination-indicator-"][aria-current="true"], [aria-current="true"][aria-label^="Page "]'
        ) as HTMLElement | null
      )?.textContent?.trim() ??
      'page-unknown';

    const firstAnchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]')
    )
      .slice(0, 5)
      .map((a) => a.getAttribute('href') ?? '')
      .join('|');

    const dismissLabels = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Dismiss "]')
    )
      .slice(0, 5)
      .map((button) => button.getAttribute('aria-label') ?? '')
      .join('|');

    return `${activePage}::${firstAnchors}::${dismissLabels}`;
  });
}

async function getVisibleJobIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ids = new Set<string>();

    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]'))
      .slice(0, 12)
      .forEach((a) => {
        const href = a.getAttribute('href') ?? '';
        const match = href.match(/\/jobs\/view\/(\d+)/);
        if (match) ids.add(match[1]);
      });

    Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Dismiss "]'))
      .slice(0, 12)
      .forEach((button) => {
        const label = button.getAttribute('aria-label') ?? '';
        if (label) ids.add(`dismiss:${label}`);
      });

    return Array.from(ids);
  });
}

async function getActivePageLabel(page: Page): Promise<string> {
  const state = await getPaginationState(page);
  return state.activeLabel;
}

async function focusPaginationControls(page: Page): Promise<void> {
  const pagination = page.locator(PAGINATION_LIST_SELECTOR).first();
  const count = await pagination.count().catch(() => 0);
  if (!count) return;

  await pagination.scrollIntoViewIfNeeded().catch(() => null);
  await delay(400, 900);

  const box = await pagination.boundingBox().catch(() => null);
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await delay(250, 600);
}

async function getPaginationState(page: Page): Promise<{
  activePage: number | null;
  activeLabel: string;
  pages: number[];
  hasNextButton: boolean;
  jobIds: string[];
  hasPaginationList: boolean;
}> {
  return page.evaluate((paginationSelector) => {
    const paginationList = document.querySelector(paginationSelector);
    const paginationRoot = paginationList?.parentElement ?? paginationList ?? null;

    if (!paginationRoot) {
      const ids = new Set<string>();
      Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]'))
        .slice(0, 12)
        .forEach((a) => {
          const href = a.getAttribute('href') ?? '';
          const match = href.match(/\/jobs\/view\/(\d+)/);
          if (match) ids.add(match[1]);
        });

      return {
        activePage: null,
        activeLabel: 'page-unknown',
        pages: [],
        hasNextButton: false,
        jobIds: Array.from(ids),
        hasPaginationList: false,
      };
    }

    const active =
      paginationRoot.querySelector(
        '[data-testid^="pagination-indicator-"][aria-current="true"], [aria-current="true"][aria-label^="Page "]'
      ) as HTMLElement | null;

    const activeLabel =
      active?.getAttribute('aria-label') ??
      active?.textContent?.trim() ??
      'page-unknown';

    const pages = Array.from(
      paginationRoot.querySelectorAll<HTMLElement>(
        '[data-testid^="pagination-indicator-"], [aria-label^="Page "]'
      )
    )
      .map((el) => {
        const label = el.getAttribute('aria-label') ?? el.textContent ?? '';
        const match = label.match(/(\d+)/);
        return match ? Number(match[1]) : null;
      })
      .filter((value): value is number => value !== null);

    const nextButton =
      paginationRoot.querySelector('[data-testid="pagination-controls-next-button-visible"]') ??
      paginationRoot.querySelector('button[data-testid*="next-button"]');

    const ids = new Set<string>();
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]'))
      .slice(0, 12)
      .forEach((a) => {
        const href = a.getAttribute('href') ?? '';
        const match = href.match(/\/jobs\/view\/(\d+)/);
        if (match) ids.add(match[1]);
      });

    return {
      activePage: (() => {
        const match = activeLabel.match(/(\d+)/);
        return match ? Number(match[1]) : null;
      })(),
      activeLabel,
      pages,
      hasNextButton: !!nextButton,
      jobIds: Array.from(ids),
      hasPaginationList: !!paginationList,
    };
  }, PAGINATION_LIST_SELECTOR);
}

async function goToNextPage(page: Page): Promise<{
  advanced: boolean;
  reason: string;
  beforePage: string;
  afterPage: string;
  selectorUsed: string | null;
}> {
  const beforeFingerprint = await getPageFingerprint(page);
  const beforeState = await getPaginationState(page);
  const beforeVisibleJobIds = await getVisibleJobIds(page);
  const beforePage = beforeState.activeLabel;

  await focusPaginationControls(page);

  const targetPage =
    beforeState.activePage !== null &&
    beforeState.pages.includes(beforeState.activePage + 1)
      ? beforeState.activePage + 1
      : null;

  const pageButtonCandidates =
    targetPage !== null
      ? [
          {
            selector: `${PAGINATION_LIST_SELECTOR} button[aria-label="Page ${targetPage}"]`,
            locator: page.locator(
              `${PAGINATION_LIST_SELECTOR} button[aria-label="Page ${targetPage}"]`
            ).first(),
          },
          {
            selector: `[data-testid="pagination-indicator-${targetPage - 1}"]`,
            locator: page.locator(
              `[data-testid="pagination-indicator-${targetPage - 1}"]`
            ).first(),
          },
          {
            selector: `[aria-label="Page ${targetPage}"]`,
            locator: page.locator(`[aria-label="Page ${targetPage}"]`).first(),
          },
        ]
      : [];

  const nextCandidates = [
    {
      selector: '[data-testid="pagination-controls-next-button-visible"]',
      locator: page.locator('[data-testid="pagination-controls-next-button-visible"]').first(),
    },
    {
      selector: `${PAGINATION_LIST_SELECTOR} + button[data-testid*="next-button"]`,
      locator: page.locator(`${PAGINATION_LIST_SELECTOR} ~ button[data-testid*="next-button"]`).first(),
    },
    {
      selector: 'button[data-testid="pagination-controls-next-button-visible"]',
      locator: page.locator('button[data-testid="pagination-controls-next-button-visible"]').first(),
    },
  ];

  let clicked = false;
  let selectorUsed: string | null = null;
  let sawCandidate = false;
  let sawVisibleCandidate = false;
  let sawEnabledCandidate = false;

  for (const candidate of [...pageButtonCandidates, ...nextCandidates]) {
    const count = await candidate.locator.count().catch(() => 0);
    if (!count) continue;
    sawCandidate = true;

    const visible = await candidate.locator.isVisible().catch(() => false);
    const enabled = await candidate.locator.isEnabled().catch(() => false);
    if (visible) sawVisibleCandidate = true;
    if (visible && enabled) sawEnabledCandidate = true;
    if (!visible || !enabled) continue;

    const clickedWithLocator = await candidate.locator
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (clickedWithLocator) {
      clicked = true;
      selectorUsed = candidate.selector;
      break;
    }

    const handle = await candidate.locator.elementHandle().catch(() => null);
    const box = await handle?.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      clicked = true;
      selectorUsed = `${candidate.selector}:mouse`;
      break;
    }
  }

  if (!clicked) {
    return {
      advanced: false,
      reason: !sawCandidate
        ? beforeState.hasPaginationList
          ? 'pagination-rendered-without-clickable-next'
          : 'pagination-not-rendered'
        : !sawVisibleCandidate
          ? 'next-button-not-visible'
          : !sawEnabledCandidate
            ? 'next-button-disabled'
            : 'click-target-not-found',
      beforePage,
      afterPage: beforePage,
      selectorUsed,
    };
  }

  const changed = await page
    .waitForFunction(
      ({ previousFingerprint, previousJobIds, paginationSelector }) => {
        const activePage =
          (
            document.querySelector(
              '[data-testid^="pagination-indicator-"][aria-current="true"], [aria-current="true"][aria-label^="Page "]'
            ) as HTMLElement | null
          )?.getAttribute('aria-label') ??
          (
            document.querySelector(
              '[data-testid^="pagination-indicator-"][aria-current="true"], [aria-current="true"][aria-label^="Page "]'
            ) as HTMLElement | null
          )?.textContent?.trim() ??
          'page-unknown';

        const firstAnchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]')
        )
          .slice(0, 5)
          .map((a) => a.getAttribute('href') ?? '')
          .join('|');

        const dismissLabels = Array.from(
          document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Dismiss "]')
        )
          .slice(0, 5)
          .map((button) => button.getAttribute('aria-label') ?? '')
          .join('|');

        const fingerprint = `${activePage}::${firstAnchors}::${dismissLabels}`;
        if (fingerprint !== previousFingerprint) return true;

        const paginationRoot =
          document.querySelector(paginationSelector)?.parentElement ??
          document.querySelector(paginationSelector) ??
          document;
        const activeIndicator = paginationRoot.querySelector(
          '[data-testid^="pagination-indicator-"][aria-current="true"], [aria-current="true"][aria-label^="Page "]'
        ) as HTMLElement | null;
        const activeLabel =
          activeIndicator?.getAttribute('aria-label') ??
          activeIndicator?.textContent?.trim() ??
          'page-unknown';

        if (activeLabel !== 'page-unknown' && !previousJobIds.includes(`page:${activeLabel}`)) {
          return true;
        }

        const currentJobIds = Array.from(
          document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]')
        )
          .slice(0, 12)
          .map((a) => {
            const href = a.getAttribute('href') ?? '';
            const match = href.match(/\/jobs\/view\/(\d+)/);
            return match ? match[1] : href;
          })
          .filter(Boolean);

        return JSON.stringify(currentJobIds) !== JSON.stringify(previousJobIds.filter((id) => !id.startsWith('page:')));
      },
      {
        previousFingerprint: beforeFingerprint,
        previousJobIds: [
          ...previousJobIdsFromState(beforeState),
          ...beforeVisibleJobIds,
          ...(beforeState.activeLabel !== 'page-unknown' ? [`page:${beforeState.activeLabel}`] : []),
        ],
        paginationSelector: PAGINATION_LIST_SELECTOR,
      },
      { timeout: 12_000 }
    )
    .then(() => true)
    .catch(() => false);

  if (!changed) {
    const afterAttemptState = await getPaginationState(page);
    const pageChangedByLabel =
      beforeState.activeLabel !== 'page-unknown' &&
      afterAttemptState.activeLabel !== 'page-unknown' &&
      beforeState.activeLabel !== afterAttemptState.activeLabel;

    if (pageChangedByLabel) {
      return {
        advanced: true,
        reason: 'advanced',
        beforePage,
        afterPage: afterAttemptState.activeLabel,
        selectorUsed,
      };
    }

    return {
      advanced: false,
      reason: 'clicked-next-but-page-did-not-change',
      beforePage,
      afterPage: afterAttemptState.activeLabel,
      selectorUsed,
    };
  }

  await delay(1_500, 2_500);
  const afterState = await getPaginationState(page);
  const afterPage = afterState.activeLabel;
  return {
    advanced: true,
    reason: 'advanced',
    beforePage,
    afterPage,
    selectorUsed,
  };
}

function previousJobIdsFromState(state: Awaited<ReturnType<typeof getPaginationState>>): string[] {
  return state.jobIds;
}

async function isBlocked(page: Page): Promise<boolean> {
  const url = page.url();
  if (/checkpoint|authwall|challenge/.test(url)) return true;
  const title = await page.title();
  return /security verification|quick security check/i.test(title);
}

function buildUrl(query: SearchQuery): string {
  return (
    'https://www.linkedin.com/jobs/search/?' +
    new URLSearchParams({
      keywords: query.keywords,
      location: query.location,
      ...(query.geoId ? { geoId: query.geoId } : {}),
      f_WT: '2',
      f_TPR: config.LINKEDIN_POSTED_WITHIN,
      sortBy: 'DD',
    })
  );
}

function isQueryGated(url: string): boolean {
  return /linkedin\.com\/premium\/survey/i.test(url);
}

function persistQueryResult(
  runId: string,
  query: SearchQuery,
  requestedUrl: string,
  resolvedUrl: string,
  count: number,
  status: 'ok' | 'gated'
): void {
  mkdirSync(dirname(QUERY_LOG_PATH), { recursive: true });
  appendFileSync(
    QUERY_LOG_PATH,
    JSON.stringify({
      ts: new Date().toISOString(),
      runId,
      keywords: query.keywords,
      location: query.location,
      geoId: query.geoId ?? null,
      requestedUrl,
      resolvedUrl,
      count,
      status,
    }) + '\n'
  );
}

async function extractCards(page: Page): Promise<RawLinkedInJob[]> {
  return page.evaluate((sel) => {
    const parsed: RawLinkedInJob[] = [];
    const seen = new Set<string>();

    const push = (job: RawLinkedInJob) => {
      const key =
        job.url?.trim() ||
        `${job.title ?? ''}::${job.company ?? ''}::${job.location ?? ''}`;
      if (!key || seen.has(key)) return;
      seen.add(key);
      parsed.push(job);
    };

    const uniq = (items: Array<string | null | undefined>) => {
      const output: string[] = [];
      const seenText = new Set<string>();
      for (const item of items) {
        const value = item?.replace(/\s+/g, ' ').trim();
        if (!value || value === '·' || seenText.has(value)) continue;
        seenText.add(value);
        output.push(value);
      }
      return output;
    };

    if (document.querySelector(sel.jobCard)) {
      Array.from(document.querySelectorAll(sel.jobCard))
        .slice(0, 60)
        .forEach((card) => {
          push({
            title: card.querySelector(sel.title)?.textContent?.trim() ?? null,
            company: card.querySelector(sel.company)?.textContent?.trim() ?? null,
            location: card.querySelector(sel.location)?.textContent?.trim() ?? null,
            url: (card.querySelector(sel.link) as HTMLAnchorElement)?.href ?? null,
            posted_at: card.querySelector(sel.time)?.getAttribute('datetime') ?? null,
            description: null,
          });
        });
    }

    const dismissButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Dismiss "]')
    );

    for (const button of dismissButtons) {
      const dismissLabel = button.getAttribute('aria-label')?.trim() ?? '';
      if (!dismissLabel.endsWith(' job')) continue;

      const root =
        button.closest('div[role="button"]') ??
        button.closest('[componentkey]') ??
        button.parentElement?.parentElement;
      if (!root) continue;

      const titleFromLabel = dismissLabel
        .replace(/^Dismiss\s+/i, '')
        .replace(/\s+job$/i, '')
        .trim();

      const html = root.innerHTML;
      const href =
        (root.querySelector('a[href*="/jobs/view/"]') as HTMLAnchorElement | null)?.href ??
        null;
      const hrefMatch = href?.match(/\/jobs\/view\/(\d+)/);
      const inlineMatch = html.match(/\/jobs\/view\/(\d+)/);
      const urnMatch = html.match(/urn:li:(?:fs_normalized_)?jobPosting:(\d+)/);
      const jobId = hrefMatch?.[1] ?? inlineMatch?.[1] ?? urnMatch?.[1] ?? null;
      const url = href ?? (jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : null);

      const texts = uniq(
        Array.from(root.querySelectorAll('p')).map((node) => node.textContent)
      );

      const title = titleFromLabel || texts[0] || null;
      const metadata = texts.filter((text) => text !== title);
      const postedAt =
        metadata.find((text) => /posted on|reposted|ago\b/i.test(text)) ?? null;

      push({
        title,
        company: metadata[0] ?? null,
        location: metadata[1] ?? null,
        url,
        posted_at: postedAt,
        description: null,
      });
    }

    const cards = Array.from(
      document.querySelectorAll(
        'div[data-view-tracking-scope*="JobImpressionEventV2"], div[data-view-tracking-scope*="FlagshipSearchServedEvent"]'
      )
    );

    for (const card of cards) {
      const html = card.innerHTML;
      const urnMatch = html.match(/urn:li:fs_normalized_jobPosting:(\d+)/);
      if (!urnMatch) continue;

      const jobId = urnMatch[1];
      const url = `https://www.linkedin.com/jobs/view/${jobId}/`;

      const pTags = Array.from(card.querySelectorAll('p')).map(p => p.textContent?.trim() ?? '');
      const validText = pTags.filter(t => t.length > 2 && !t.includes('Be an early applicant'));

      const img = card.querySelector('img');
      let companyFallback = img ? img.getAttribute('alt')?.trim() : null;
      if (!companyFallback && validText[1]) companyFallback = validText[1];

      push({
        title: validText[0] || 'Unknown Title',
        company: companyFallback || 'Unknown Company',
        location: validText[1] !== companyFallback ? validText[2] || validText[1] : validText[2] || 'Unknown Location',
        url,
        posted_at: new Date().toISOString(),
        description: null,
      });
    }

    return parsed.slice(0, 100);
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
      const requestedUrl = buildUrl(q);
      await page.goto(requestedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      if (await isBlocked(page)) {
        await browser.close();
        throw new Error('LINKEDIN_BLOCKED');
      }

      const resolvedUrl = page.url();
      if (isQueryGated(resolvedUrl)) {
        logger.warn(
          {
            runId,
            query: q.keywords,
            location: q.location,
            geoId: q.geoId,
            requestedUrl,
            resolvedUrl,
          },
          'query gated by LinkedIn premium survey'
        );
        persistQueryResult(runId, q, requestedUrl, resolvedUrl, 0, 'gated');
        continue;
      }

      const jobs: RawLinkedInJob[] = [];
      let pageCount = 0;
      let paginationResult: Awaited<ReturnType<typeof goToNextPage>> | null = null;

      do {
        pageCount += 1;

        await scroll(page);
        await page
          .waitForSelector(`${SELECTORS.jobCard}, button[aria-label^="Dismiss "]`, {
            timeout: 10_000,
          })
          .catch(() => null);

        const paneDebug = await getResultsPaneDebug(page);
        const pageJobs = await extractCards(page);
        jobs.push(...pageJobs);

        logger.info(
          {
            runId,
            query: q.keywords,
            location: q.location,
            geoId: q.geoId,
            page: pageCount,
            count: pageJobs.length,
            domJobCardCount: paneDebug.jobCardCount,
            domDismissButtonCount: paneDebug.dismissButtonCount,
            domJobLinkCount: paneDebug.jobLinkCount,
            domImpressionCardCount: paneDebug.impressionCardCount,
            visibleJobIdsSample: paneDebug.visibleJobIdsSample,
            scrollHeights: paneDebug.scrollHeights,
          },
          'results page scraped'
        );

        if (pageCount >= MAX_PAGINATION_PAGES) {
          paginationResult = {
            advanced: false,
            reason: 'reached-max-pagination-pages',
            beforePage: await getActivePageLabel(page),
            afterPage: await getActivePageLabel(page),
            selectorUsed: null,
          };
          break;
        }

        paginationResult = await goToNextPage(page);
        const paginationState = await getPaginationState(page).catch(() => ({
          activePage: null,
          activeLabel: 'page-unknown',
          pages: [],
          hasNextButton: false,
          jobIds: [],
          hasPaginationList: false,
        }));
        logger.info(
          {
            runId,
            query: q.keywords,
            location: q.location,
            geoId: q.geoId,
            page: pageCount,
            beforePage: paginationResult.beforePage,
            afterPage: paginationResult.afterPage,
            advanced: paginationResult.advanced,
            reason: paginationResult.reason,
            selectorUsed: paginationResult.selectorUsed,
            paginationPages: paginationState.pages,
            hasNextButton: paginationState.hasNextButton,
            hasPaginationList: paginationState.hasPaginationList,
          },
          'pagination check'
        );
      } while (paginationResult?.advanced);

      logger.info(
        {
          runId,
          query: q.keywords,
          location: q.location,
          geoId: q.geoId,
          count: jobs.length,
          pages: pageCount,
          paginationStopReason: paginationResult?.reason ?? 'unknown',
          requestedUrl,
          resolvedUrl,
        },
        'query done'
      );
      persistQueryResult(runId, q, requestedUrl, resolvedUrl, jobs.length, 'ok');
      all.push(...jobs);

      await delay(4_000, 8_000);
    } catch (err: any) {
      if (err.message === 'LINKEDIN_BLOCKED') throw err;
      logger.warn(
        { query: q.keywords, location: q.location, geoId: q.geoId, err: err.message },
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
    if (!job.url || job.description !== null) continue;

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
        job.description = stripHtml(desc).slice(0, 5_000);
      }
      logger.info({ url: job.url }, 'hydrated full description');
      fetchCount++;
    } catch {
      logger.debug({ url: job.url }, 'failed to fetch description, skipping');
    }
  }

  await browser.close();
}
