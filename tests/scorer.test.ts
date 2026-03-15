import { describe, it, expect } from 'vitest';
import { scoreJob, getTier } from '../src/filter/scorer';

describe('scoreJob', () => {
  it('scores worldwide React+TS job with Russian as High', () => {
    const s = scoreJob(
      'Senior React Developer',
      'Remote (Worldwide)',
      'React TypeScript Next.js english russian'
    );
    expect(s).toBeGreaterThanOrEqual(70);
    expect(getTier(s)).toBe('high');
  });

  it('scores EU-only React job as Maybe', () => {
    const s = scoreJob(
      'React Frontend Engineer',
      'Remote (EU)',
      'Building web applications'
    );
    expect(s).toBeGreaterThanOrEqual(40);
    expect(s).toBeLessThan(70);
    expect(getTier(s)).toBe('maybe');
  });

  it('scores Ukrainian-required job as Skip', () => {
    const s = scoreJob(
      'React Developer',
      'Ukraine',
      'Ukrainian language required. React TypeScript. must be EU resident'
    );
    expect(s).toBeLessThan(40);
    expect(getTier(s)).toBe('skip');
  });
});
