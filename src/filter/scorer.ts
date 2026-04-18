import { config } from '../config';
import { isFakeRemote } from './fakeRemote';

export function scoreJob(
  title: string,
  company: string,
  location: string,
  description: string
): number {
  const t = title.toLowerCase();
  const c = (company ?? '').toLowerCase();
  const d = (description ?? '').toLowerCase();
  const l = location.toLowerCase();
  const all = t + ' ' + c + ' ' + l + ' ' + d;

  let score = 30;

  // --- Stack bonuses ---
  if (/react|reactjs/.test(all)) score += 18;
  else score -= 6;
  if (/typescript/.test(all)) score += 12;
  if (/javascript/.test(all)) score += 8;
  if (/next\.?js/.test(all)) score += 10;
  if (/node\.?js|nodejs/.test(d)) score += 8;
  if (/nestjs|nest\.js/.test(d)) score += 10;
  if (/graphql|postgresql|postgres/.test(d)) score += 5;

  // --- Remote quality (else-if chain, except fake-remote penalty stacks) ---
  if (
    /worldwide|work from anywhere|anywhere in the world|location.?agnostic|globally distributed/.test(
      all
    )
  ) {
    score += 25;
  } else if (/remote.?first|distributed team|fully remote|async.?first/.test(all)) {
    score += 18;
  } else if (/cyprus|malta/.test(all)) {
    score += 4;
  } else if (/remote.*(europe|eu|eea)|europe.*remote/.test(all)) {
    score -= 5;
  } else if (/remote.*(usa|united states|americas|canada)/.test(all)) {
    score -= 12;
  }

  // --- Company type bonuses ---
  if (/\bstartup\b|seed funded|series [ab]|early.?stage/.test(all)) score += 8;
  if (/\bagency\b|outsource|outsourcing|client.?facing|b2b/.test(all)) score += 8;
  if (/distributed team|async.?first|no office|small team|international team/.test(all)) score += 5;
  if (/team of \d{1,2}\b/.test(all)) score += 6;
  if (/we are a team of|join our small team/.test(all)) score += 6;
  if (/growing team|fast.?growing/.test(all)) score += 4;
  if (
    /\b(amazon|google|meta|microsoft|oracle|ibm|accenture|epam|tcs|infosys|cognizant|deloitte|capgemini|globant)\b/.test(
      c
    )
  ) {
    score -= 15;
  }
  if (/enterprise|stakeholders|cross-functional|agile ceremonies/.test(d)) {
    score -= 5;
  }

  // Region specific penalties
  if (/latin america|latam/.test(l)) score -= 15;
  if (/\bindia\b/.test(l) && !/worldwide|global/.test(all)) score -= 10;

  // Fake-remote penalty stacks on top of the above
  if (isFakeRemote(all)) score -= 15;

  // --- Language ---
  if (/russian|русский|рус\.\s?яз/.test(d)) {
    score += 5;
    if (/english/.test(d)) score += 10;
  }
  if (/ukrainian required|ukrainian language/.test(d)) score -= 40;

  // --- Seniority ---
  if (/\b(senior|sr\.|lead|staff|principal)\b/.test(t)) {
    score -= 10;
  } else if (/\b(mid.?level|middle)\b/.test(t)) {
    score += 8;
  } else if (/\b(director|vp|head of|c-level|cto)\b/.test(t)) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function getTier(score: number): 'high' | 'maybe' | 'skip' {
  if (score >= config.SCORE_HIGH) return 'high';
  if (score >= config.SCORE_MAYBE) return 'maybe';
  return 'skip';
}
