import { isFakeRemote } from './fakeRemote';

export function scoreJob(
  title: string,
  location: string,
  description: string
): number {
  const t = title.toLowerCase();
  const d = (description ?? '').toLowerCase();
  const l = location.toLowerCase();
  const all = t + ' ' + l + ' ' + d;

  let score = 30;

  // --- Stack bonuses ---
  if (/react|reactjs/.test(t)) score += 15;
  if (/typescript|\bts\b/.test(t)) score += 15;
  if (/next\.?js/.test(all)) score += 10;
  if (/node\.?js|nodejs/.test(d)) score += 10;
  if (/nestjs|nest\.js/.test(d)) score += 10;
  if (/graphql|postgresql|postgres/.test(d)) score += 5;

  // --- Remote quality (else-if chain, except fake-remote penalty stacks) ---
  if (
    /worldwide|global remote|fully remote|work from anywhere|location.?agnostic/.test(
      all
    )
  ) {
    score += 15;
  } else if (/cyprus|malta/.test(all)) {
    score += 10;
  } else if (/remote.*(europe|eu|eea)|europe.*remote/.test(all)) {
    score += 5;
  } else if (/remote.*(usa|united states|americas|canada)/.test(all)) {
    score += 3;
  }

  // Fake-remote penalty stacks on top of the above
  if (isFakeRemote(all)) score -= 15;

  // --- Language ---
  if (/russian|русский|рус\.\s?яз/.test(d)) {
    score += 20;
    if (/english/.test(d)) score += 10;
  }
  if (/ukrainian required|ukrainian language/.test(d)) score -= 40;

  // --- Seniority ---
  if (/\b(senior|sr\.|lead|staff|principal)\b/.test(t)) {
    score += 10;
  } else if (/\b(mid.?level|middle)\b/.test(t)) {
    score += 5;
  } else if (/\b(director|vp|head of|c-level|cto)\b/.test(t)) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function getTier(score: number): 'high' | 'maybe' | 'skip' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'maybe';
  return 'skip';
}
