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
  // Cyprus
  { keywords: 'Frontend Developer React', location: 'Cyprus' },
  { keywords: 'React Next.js TypeScript', location: 'Cyprus' },
  { keywords: 'Full Stack Node.js TypeScript', location: 'Cyprus' },
  { keywords: 'NestJS Developer', location: 'Cyprus' },

  // Malta
  { keywords: 'Frontend Developer React', location: 'Malta' },
  { keywords: 'React Next.js TypeScript', location: 'Malta' },
  { keywords: 'Full Stack Node.js TypeScript', location: 'Malta' },
  { keywords: 'NestJS Developer', location: 'Malta' },

  // Ukraine
  { keywords: 'Frontend Developer React', location: 'Ukraine' },
  { keywords: 'React Next.js TypeScript', location: 'Ukraine' },
  { keywords: 'Full Stack Node.js TypeScript', location: 'Ukraine' },
  { keywords: 'NestJS Developer', location: 'Ukraine' },

  // Europe (EEA)
  { keywords: 'Frontend Developer React', location: 'European Economic Area' },
  { keywords: 'React Next.js TypeScript', location: 'European Economic Area' },
  { keywords: 'Full Stack Node.js TypeScript', location: 'European Economic Area' },
  { keywords: 'NestJS Developer', location: 'European Economic Area' },

  // United States
  { keywords: 'Frontend Developer React Remote', location: 'United States' },
  { keywords: 'React Next.js TypeScript Remote', location: 'United States' },
  { keywords: 'Full Stack Node.js TypeScript Remote', location: 'United States' },
  { keywords: 'NestJS Developer Remote', location: 'United States' },
];
