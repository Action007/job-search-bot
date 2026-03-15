import { describe, it, expect } from 'vitest';
import { isFakeRemote } from '../src/filter/fakeRemote';

describe('isFakeRemote', () => {
  it('detects residency requirement', () => {
    expect(isFakeRemote('Must be based in Germany.')).toBe(true);
  });

  it('detects EU citizens only', () => {
    expect(isFakeRemote('EU citizens only. Remote within Poland.')).toBe(true);
  });

  it('does not flag worldwide remote', () => {
    expect(isFakeRemote('Fully remote. Work from anywhere.')).toBe(false);
  });

  it('detects no visa sponsorship', () => {
    expect(isFakeRemote('No visa sponsorship available.')).toBe(true);
  });
});
