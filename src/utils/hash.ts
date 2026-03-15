import { createHash } from 'crypto';

export const urlHash = (url: string): string =>
  createHash('sha256').update(url.trim().toLowerCase()).digest('hex');

export const tcHash = (title: string, company: string): string =>
  createHash('sha256')
    .update(`${title.toLowerCase().trim()}|${company.toLowerCase().trim()}`)
    .digest('hex');

export const jobId = (url: string): string => urlHash(url).slice(0, 16);
