import { TelegramDigestItem, RunStats } from '../types';

const LIMIT = 4000;

function formatJob(i: number, j: TelegramDigestItem): string {
  return [
    '',
    `${i}. ${j.title} @ ${j.company}`,
    `   📍 ${j.location} | 🗓 ${j.posted_at}`,
    j.stack ? `   🔧 ${j.stack}` : '',
    `   ⭐ Score: ${j.score}/100`,
    `   🔗 ${j.url}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatDigest(
  jobs: TelegramDigestItem[],
  stats: RunStats
): string {
  const icon = stats.run_type === 'morning' ? '🌅' : '🌆';
  const label = stats.run_type === 'morning' ? 'Morning' : 'Evening';
  const header = `${icon} ${label} Digest — ${jobs.length} jobs | ${new Date().toISOString().slice(0, 10)}\n`;

  const high = jobs.filter((j) => j.tier === 'high');
  const maybe = jobs.filter((j) => j.tier === 'maybe');

  const lines: string[] = [header];

  if (high.length) {
    lines.push(`\n🔥 HIGH PRIORITY (${high.length})\n─────────────────`);
    high.forEach((j, i) => lines.push(formatJob(i + 1, j)));
  }

  if (maybe.length) {
    lines.push(`\n💛 MAYBE (${maybe.length})\n─────────────────`);
    maybe.forEach((j, i) =>
      lines.push(formatJob(high.length + i + 1, j))
    );
  }

  lines.push(`\n─────────────────`);
  lines.push(
    `📊 ${stats.scraped} scraped → ${stats.sent} sent | ${Math.round(stats.duration / 1000)}s`
  );

  return lines.join('\n');
}

export function splitMessages(text: string): string[] {
  if (text.length <= LIMIT) return [text];

  const messages: string[] = [];
  let current = '';

  for (const chunk of text.split(/\n(?=\d+\. )/)) {
    if ((current + chunk).length > LIMIT) {
      if (current) messages.push(current.trim());
      current = chunk;
    } else {
      current += '\n' + chunk;
    }
  }

  if (current) messages.push(current.trim());
  return messages;
}
