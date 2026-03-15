import { NormalizedJob } from '../types';
import { config } from '../config';
import { wasRecentlySent } from '../db/queries';

export function dedup(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>();
  const result: NormalizedJob[] = [];

  for (const job of jobs) {
    // In-run dedup (same job from two queries)
    if (seen.has(job.url_hash) || seen.has(job.title_co_hash)) continue;
    seen.add(job.url_hash);
    seen.add(job.title_co_hash);

    // DB dedup: already sent within window?
    if (wasRecentlySent(job.url_hash, job.title_co_hash, config.DEDUP_WINDOW_DAYS)) {
      continue;
    }

    result.push(job);
  }

  return result;
}
