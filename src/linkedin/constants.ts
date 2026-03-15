import { SearchQuery } from '../types';

// NOTE: When scraper returns 0 results, fix selectors here first.
// This is the ONLY file to touch when LinkedIn changes HTML.

export const SELECTORS = {
  jobCard: '.job-card-container',
  title: '.job-card-list__title--link',
  company: '.artdeco-entity-lockup__subtitle span',
  location: '.job-card-container__metadata-wrapper li span',
  link: '.job-card-list__title--link',
  time: 'time',
  description: '.jobs-description__content, .description__text',
};

export const SEARCH_QUERIES: SearchQuery[] = [
  { keywords: 'React Developer', location: 'Cyprus' },
  { keywords: 'Frontend Developer TypeScript', location: 'Cyprus' },
  { keywords: 'React Developer', location: 'Malta' },
  { keywords: 'Frontend Developer', location: 'Malta' },
  { keywords: 'React TypeScript Remote', location: 'Europe' },
  { keywords: 'Full Stack Node.js TypeScript', location: 'Worldwide' },
  { keywords: 'React Developer Remote', location: 'United States' },
  { keywords: 'NestJS Developer', location: 'Worldwide' },
  { keywords: 'Next.js Developer', location: 'Europe' },
  { keywords: 'Frontend Developer', location: 'Ukraine' },
];
