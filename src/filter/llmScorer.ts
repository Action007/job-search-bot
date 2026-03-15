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

  const prompt = `You are an expert technical recruiter analyzing a job against a specific developer profile.
Evaluate the following job:
Title: ${title}
Company: ${company}
Location: ${location}
Rule Score (pre-eval): ${ruleScore}
Description:
${truncatedDesc}

Candidate CV:
${cvText}

Return strictly formatted JSON only containing:
is_fake_remote (boolean)
hidden_restriction (string or null)
stack_fit ("strong"|"partial"|"weak")
cv_fit ("strong"|"partial"|"weak")
score_adjustment (integer between -20 and 20)
reasoning_short (string, max 2 sentences)`;

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
        messages: [{ role: 'user', content: prompt }],
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
