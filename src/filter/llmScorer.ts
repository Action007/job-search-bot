import { config } from '../config';
import { logger } from '../utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface LLMScoreResult {
  is_fake_remote: boolean;
  hidden_restriction: string | null;
  stack_fit: 'strong' | 'partial' | 'weak';
  cv_fit: 'strong' | 'partial' | 'weak';
  score_adjustment: number;
  reasoning_short: string;
}

const DEFAULT_RESULT: LLMScoreResult = {
  is_fake_remote: false,
  hidden_restriction: null,
  stack_fit: 'partial',
  cv_fit: 'partial',
  score_adjustment: 0,
  reasoning_short: 'LLM evaluation skipped or failed',
};

function getCVText(): string {
  try {
    return readFileSync(join(process.cwd(), 'data/cv/base_cv.txt'), 'utf8');
  } catch (err: any) {
    logger.warn('Could not read base_cv.txt, sending job without CV context.');
    return 'No predefined CV provided.';
  }
}

export async function evaluateJobContext(
  title: string,
  company: string,
  location: string,
  description: string,
  ruleScore: number
): Promise<LLMScoreResult> {
  const apiKey = config.OPENAI_API_KEY;
  if (!apiKey) {
    return DEFAULT_RESULT; // Safe fallback for V1 configurations
  }

  const cvText = getCVText();
  const truncatedDesc = description.slice(0, 5000);

  const systemPrompt = `You are an expert technical recruiter scoring a job posting against a specific developer's CV and preferences.

CANDIDATE PROFILE SUMMARY:
- 4+ years of experience (willing to apply for "Senior" roles asking 5-6 years)
- Primary stack: React, Next.js, TypeScript, Node.js, NestJS, PostgreSQL
- Secondary stack: Java, Spring Boot
- Target roles: Frontend Developer, Full-Stack Developer, Software Engineer (web)
- NOT interested in: DevOps, SRE, Data Science, ML/AI, QA, Mobile (native), Embedded, UX/UI Design, Consulting, Management, or any non-software-engineering role
- Preferred work: Remote-first or Cyprus/Malta on-site
- Languages: English (C1), Russian (C1), Turkish (C1), Azerbaijani (C2)

SCORING RULES (follow strictly):

1. SENIORITY & COMPENSATION:
   - "Senior" titles with 4-6 years required and modest pay (≤$40/hr, ≤€80k, or unstated): treat as STRONG match, score_adjustment +5 to +15
   - "Senior" titles with 8+ years strictly required OR high comp (>$80k-$90k USD/yr, >$40/hr): PENALIZE HEAVILY (-15 to -20)
   - If compensation is NOT stated in the description, assume it is modest — do NOT penalize for seniority alone

2. STACK FIT:
   - strong: Role's primary tech is React/Next.js/TypeScript/Node.js/NestJS
   - partial: Role uses the candidate's tech but also requires significant tech they lack (e.g., Python, Go, AWS, Kubernetes)
   - weak: Role's primary tech is completely different (C++, Rust, Go, .NET, PHP, Ruby, etc.)

3. DOMAIN FIT:
   - If the role is NOT a software engineering/development role (e.g., meteorology, finance research, voice acting, PPC management, consulting), set cv_fit to "weak" and score_adjustment to -20

4. FAKE REMOTE DETECTION:
   - Set is_fake_remote=true if the job says "remote" but then requires: specific US state residency, regular office visits, on-site days, or citizenship/clearance that the candidate cannot satisfy
   - Set is_fake_remote=false otherwise

5. HIDDEN RESTRICTIONS:
   - Flag any dealbreakers buried in the description: security clearance, citizenship requirements, language requirements the candidate doesn't meet, mandatory relocation

Return ONLY valid JSON with these fields:
{
  "is_fake_remote": boolean,
  "hidden_restriction": string | null,
  "stack_fit": "strong" | "partial" | "weak",
  "cv_fit": "strong" | "partial" | "weak",
  "score_adjustment": integer (-20 to 20),
  "reasoning_short": string (max 2 sentences)
}`;

  const userPrompt = `Evaluate this job:
Title: ${title}
Company: ${company}
Location: ${location}
Rule Score (pre-eval): ${ruleScore}

Description:
${truncatedDesc}

Candidate CV:
${cvText}`;

  try {
    logger.info({ target: title, model: config.LLM_MODEL }, 'Evaluating parsed context securely');
    const res = await fetch(`${config.OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      throw new Error(`LLM API Error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json() as any;
    const jsonStr = data.choices[0].message.content;
    const parsed = JSON.parse(jsonStr) as Partial<LLMScoreResult>;

    // Bound the numeric effect
    let safeAdjustment = Number(parsed.score_adjustment) || 0;
    if (safeAdjustment > 20) safeAdjustment = 20;
    if (safeAdjustment < -20) safeAdjustment = -20;

    return {
      is_fake_remote: !!parsed.is_fake_remote,
      hidden_restriction: parsed.hidden_restriction ?? null,
      stack_fit: (parsed.stack_fit as any) || 'partial',
      cv_fit: (parsed.cv_fit as any) || 'partial',
      score_adjustment: safeAdjustment,
      reasoning_short: parsed.reasoning_short ?? 'Evaluated successfully.',
    };
  } catch (err: any) {
    logger.error({ err: err.message }, 'LLM evaluation failed (falling back to neutral)');
    return DEFAULT_RESULT;
  }
}
