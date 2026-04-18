import { RawLinkedInJob, NormalizedJob } from '../types';
import { urlHash, tcHash, jobId } from '../utils/hash';

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDate(raw: string | null): string {
  if (!raw) return new Date().toISOString();
  if (/^\d{4}/.test(raw)) return raw;
  const match = raw.match(/(\d+)\s+(minute|hour|day)/);
  if (!match) return new Date().toISOString();
  const [, n, unit] = match;
  const ms =
    { minute: 60_000, hour: 3_600_000, day: 86_400_000 }[unit]! *
    parseInt(n);
  return new Date(Date.now() - ms).toISOString();
}

function collapseRepeatedText(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return normalized;

  const half = normalized.length / 2;
  if (Number.isInteger(half)) {
    const left = normalized.slice(0, half).trim();
    const right = normalized.slice(half).trim();
    if (left && left === right) return left;
  }

  return normalized.replace(/\b(.{3,}?)\s+\1\b/gi, '$1');
}

export function normalizeJob(
  raw: RawLinkedInJob,
  runId: string
): NormalizedJob | null {
  if (!raw.url || !raw.title) return null;

  const idMatch = raw.url.match(/\/jobs\/view\/(\d+)/);
  const canonicalUrl = idMatch
    ? `https://www.linkedin.com/jobs/view/${idMatch[1]}/`
    : raw.url;

  const hashString = urlHash(canonicalUrl);

  return {
    id: jobId(canonicalUrl),
    short_id: hashString.slice(0, 6),
    url: canonicalUrl,
    url_hash: hashString,
    title_co_hash: tcHash(collapseRepeatedText(raw.title), collapseRepeatedText(raw.company ?? '')),
    title: collapseRepeatedText(raw.title).slice(0, 200),
    company: collapseRepeatedText(raw.company ?? '').slice(0, 100),
    location: collapseRepeatedText(raw.location ?? '').slice(0, 100),
    description: raw.description
      ? stripHtml(raw.description).slice(0, 5_000)
      : null,
    posted_at: normalizeDate(raw.posted_at),
    run_id: runId,
  };
}

export function detectStack(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  const found: string[] = [];
  if (/react/.test(text)) found.push('React');
  if (/typescript/.test(text)) found.push('TypeScript');
  if (/next\.?js/.test(text)) found.push('Next.js');
  if (/node\.?js/.test(text)) found.push('Node.js');
  if (/nestjs/.test(text)) found.push('NestJS');
  if (/graphql/.test(text)) found.push('GraphQL');
  return found.slice(0, 4).join(', ');
}
