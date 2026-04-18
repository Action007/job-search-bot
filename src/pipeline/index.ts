import { randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { checkCookieAge } from '../linkedin/sessionCheck';
import { runScraper, enrichWithDescriptions } from '../linkedin/scraper';
import { normalizeJob, detectStack } from '../parsing/normalize';
import { dedup } from './dedup';
import { isHardReject } from '../filter/hardReject';
import { scoreJob, getTier } from '../filter/scorer';
import { evaluateJobContext } from '../filter/llmScorer';
import { saveJob, markSent, createRun, completeRun } from '../db/queries';
import { ScoredJob, TelegramDigestItem, RunStats } from '../types';
import { sendAlert, sendDigest } from '../telegram/sender';

const LOCK = '/tmp/linkedin-bot.lock';
const LEGACY_LOCK_STALE_MS = 5 * 60 * 1000;

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function runPipeline(
  runType: 'morning' | 'evening'
): Promise<void> {
  if (existsSync(LOCK)) {
    const rawLock = readFileSync(LOCK, 'utf8').trim();

    try {
      const parsedLock = JSON.parse(rawLock) as { pid?: number; startedAt?: number };
      const lockAge = Date.now() - Number(parsedLock.startedAt);
      const pid = Number(parsedLock.pid);

      if (
        Number.isFinite(parsedLock.startedAt) &&
        Number.isFinite(pid) &&
        isPidRunning(pid) &&
        lockAge <= config.MAX_RUN_DURATION_MS
      ) {
        logger.warn({ pid, lockAge }, 'Another run is already active — skipping');
        return;
      }

      logger.warn({ pid, lockAge }, 'Stale lock detected — clearing it');
      unlinkSync(LOCK);
    } catch {
      const legacyStartedAt = Number(rawLock);
      const legacyAge = Date.now() - legacyStartedAt;

      if (Number.isFinite(legacyStartedAt) && legacyAge <= LEGACY_LOCK_STALE_MS) {
        logger.warn({ legacyAge }, 'Another run is already active — skipping');
        return;
      }

      logger.warn({ legacyAge }, 'Legacy stale lock detected — clearing it');
      unlinkSync(LOCK);
    }
  }
  writeFileSync(
    LOCK,
    JSON.stringify({ pid: process.pid, startedAt: Date.now() })
  );

  const runId = randomUUID();
  const startMs = Date.now();

  try {
    createRun(runId, runType);
    logger.info({ runId, runType }, 'Pipeline started');

    await checkCookieAge(config.LINKEDIN_COOKIES_PATH);

    let rawJobs;
    try {
      rawJobs = await runScraper(runId);
    } catch (err: any) {
      if (err.message === 'LINKEDIN_BLOCKED') {
        await sendAlert(
          `🚫 LinkedIn CAPTCHA detected. Run stopped.\nCheck your IP / account. Run ID: ${runId}`
        );
        completeRun(runId, 'blocked', 0, 0, Date.now() - startMs, err.message);
        return;
      }
      throw err;
    }

    const scrapedCount = rawJobs.length;
    logger.info({ scrapedCount }, 'Scraping complete');

    const normalized = rawJobs
      .map((r) => normalizeJob(r, runId))
      .filter((j): j is NonNullable<typeof j> => j !== null);

    logger.info({ normalized: normalized.length }, 'Normalization complete');

    const unique = dedup(normalized);
    logger.info({ unique: unique.length }, 'Dedup complete');

    const preliminaryScored: ScoredJob[] = [];
    const rejectedBuffer: ScoredJob[] = [];

    for (const job of unique) {
      if (isHardReject(job.title, job.description ?? '', job.location)) {
        rejectedBuffer.push({
          ...job,
          score: -1,
          tier: 'reject',
          stack: detectStack(job.title, job.description ?? ''),
        });
      } else {
        const score = scoreJob(
          job.title,
          job.company,
          job.location,
          job.description ?? ''
        );
        preliminaryScored.push({
          ...job,
          score,
          tier: getTier(score),
          stack: detectStack(job.title, job.description ?? ''),
        });
      }
    }

    const shortlist = preliminaryScored.filter(
      (j) => j.score >= config.SCORE_MAYBE
    );

    logger.info({ shortlisted: shortlist.length }, 'Base scoring complete, moving to description hydration');

    await enrichWithDescriptions(shortlist, config.MAX_LLM_EVALS_PER_RUN);
    logger.info('Description hydration complete, moving to AI evaluation phase');

    const scored: ScoredJob[] = [];
    const postHydrationRejected: ScoredJob[] = [];
    let llmEvals = 0;

    for (const job of shortlist) {
      if (llmEvals < config.MAX_LLM_EVALS_PER_RUN && job.description) {
        logger.info({ title: job.title, company: job.company }, 'Sending job context to AI Evaluator');
        
        const llmResult = await evaluateJobContext(
          job.title,
          job.company,
          job.location,
          job.description,
          job.score
        );

        job.score += llmResult.score_adjustment;

        if (job.score > 100) job.score = 100;
        if (job.score < 0) job.score = 0;
        job.tier = getTier(job.score);

        llmEvals++;
        logger.info(
          { 
            url: job.url, 
            score_effect: llmResult.score_adjustment, 
            new_score: job.score,
            reasoning: llmResult.reasoning_short 
          }, 
          'AI Evaluator complete'
        );
      }
    }

    for (const job of preliminaryScored) {
      if (isHardReject(job.title, job.description ?? '', job.location)) {
        postHydrationRejected.push({
          ...job,
          score: -1,
          tier: 'reject',
          stack: detectStack(job.title, job.description ?? ''),
        });
        continue;
      }

      saveJob(job);
      scored.push(job);
    }

    for (const rejected of rejectedBuffer) {
      saveJob(rejected);
    }

    for (const rejected of postHydrationRejected) {
      saveJob(rejected);
    }

    logger.info(
      { finalScored: scored.length, rejectedAfterHydration: postHydrationRejected.length, llmEvals },
      'LLM scoring pass complete'
    );

    const sendable = scored.filter(
      (j) => j.tier === 'high' || j.tier === 'maybe'
    );

    if (sendable.length === 0) {
      await sendAlert(
        `ℹ️ No sendable jobs found in ${runType} run.\nScraping worked, but everything was filtered out or down-ranked. Check query logs for gated or location-restricted results.`
      );
      completeRun(runId, 'complete', scrapedCount, 0, Date.now() - startMs);
      return;
    }

    const digestItems: TelegramDigestItem[] = sendable.map((j) => ({
      short_id: j.short_id,
      title: j.title,
      company: j.company,
      location: j.location,
      posted_at: j.posted_at,
      stack: j.stack,
      score: j.score,
      url: j.url,
      tier: j.tier as 'high' | 'maybe',
    }));

    const stats: RunStats = {
      run_type: runType,
      scraped: scrapedCount,
      sent: sendable.length,
      duration: Date.now() - startMs,
    };

    if (!config.DRY_RUN) {
      await sendDigest(digestItems, stats);
      for (const j of sendable) {
        markSent(j.id, runId);
      }
      logger.info({ sent: sendable.length }, 'Digest sent');
    } else {
      logger.info({ sent: sendable.length }, 'DRY_RUN — digest not sent');
    }

    completeRun(
      runId,
      'complete',
      scrapedCount,
      sendable.length,
      Date.now() - startMs
    );

    logger.info({ runId, duration: Date.now() - startMs }, 'Pipeline complete');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Pipeline error');
    await sendAlert(
      `❌ Pipeline error: ${err.message}\nRun ID: ${runId}`
    );
    completeRun(runId, 'failed', 0, 0, Date.now() - startMs, err.message);
    } finally {
    try {
      unlinkSync(LOCK);
    } catch {
    }
  }
}

// Direct execution support
if (require.main === module) {
  const hour = new Date().getUTCHours();
  const runType = hour < 12 ? 'morning' : 'evening';
  runPipeline(runType as 'morning' | 'evening')
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
