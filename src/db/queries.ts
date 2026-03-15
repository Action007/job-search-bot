import { db } from './index';
import { ScoredJob } from '../types';

const insertJob = db.prepare(`
  INSERT OR IGNORE INTO jobs
    (id, short_id, url, url_hash, title_co_hash, title, company, location, description, posted_at, score, tier, run_id)
  VALUES
    (@id, @short_id, @url, @url_hash, @title_co_hash, @title, @company, @location, @description, @posted_at, @score, @tier, @run_id)
`);

const insertSent = db.prepare(`
  INSERT INTO sent_jobs (job_id, run_id) VALUES (@job_id, @run_id)
`);

const insertRun = db.prepare(`
  INSERT INTO job_runs (id, run_type) VALUES (@id, @run_type)
`);

const updateRun = db.prepare(`
  UPDATE job_runs
  SET status = @status,
      scraped_count = @scraped_count,
      sent_count = @sent_count,
      duration_ms = @duration_ms,
      error = @error,
      completed_at = datetime('now')
  WHERE id = @id
`);

const recentSentQuery = db.prepare(`
  SELECT s.sent_at FROM jobs j
  JOIN sent_jobs s ON s.job_id = j.id
  WHERE j.url_hash = ? OR j.title_co_hash = ?
  ORDER BY s.sent_at DESC LIMIT 1
`);

const insertFeedback = db.prepare(`
  INSERT INTO user_feedback (job_id, action) VALUES (@job_id, @action)
`);

const resolveShortIdQuery = db.prepare(`
  SELECT id FROM jobs WHERE short_id = ? LIMIT 1
`);

const getBotStateQuery = db.prepare(`
  SELECT value FROM bot_state WHERE key = ?
`);

const setBotStateQuery = db.prepare(`
  INSERT INTO bot_state (key, value) VALUES (@key, @value)
  ON CONFLICT(key) DO UPDATE SET value = @value
`);

export function saveJob(job: ScoredJob): void {
  insertJob.run({
    id: job.id,
    short_id: job.short_id,
    url: job.url,
    url_hash: job.url_hash,
    title_co_hash: job.title_co_hash,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    posted_at: job.posted_at,
    score: job.score,
    tier: job.tier,
    run_id: job.run_id,
  });
}

export function markSent(jobId: string, runId: string): void {
  insertSent.run({ job_id: jobId, run_id: runId });
}

export function createRun(runId: string, runType: string): void {
  insertRun.run({ id: runId, run_type: runType });
}

export function completeRun(
  runId: string,
  status: string,
  scrapedCount: number,
  sentCount: number,
  durationMs: number,
  error?: string
): void {
  updateRun.run({
    id: runId,
    status,
    scraped_count: scrapedCount,
    sent_count: sentCount,
    duration_ms: durationMs,
    error: error ?? null,
  });
}

export function wasRecentlySent(
  urlHashVal: string,
  titleCoHashVal: string,
  windowDays: number
): boolean {
  const row = recentSentQuery.get(urlHashVal, titleCoHashVal) as
    | { sent_at: string }
    | undefined;

  if (!row?.sent_at) return false;

  const daysSince =
    (Date.now() - new Date(row.sent_at).getTime()) / 86_400_000;
  return daysSince < windowDays;
}

export function saveFeedback(jobId: string, action: string): void {
  insertFeedback.run({ job_id: jobId, action });
}

export function resolveShortId(shortId: string): string | null {
  const row = resolveShortIdQuery.get(shortId) as { id: string } | undefined;
  return row?.id ?? null;
}

export function getBotState(key: string): string | null {
  const row = getBotStateQuery.get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setBotState(key: string, value: string): void {
  setBotStateQuery.run({ key, value });
}
