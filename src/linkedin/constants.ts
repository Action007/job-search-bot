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

// ─── Query Templates ────────────────────────────────────────────────────────

// Q1: Pure frontend — only excludes Java/Spring (truly wrong stacks).
// Does NOT exclude Node/NestJS because many frontend jobs mention backend tech
// in the description (e.g. "collaborate with our Node.js team").
const Q1_FRONTEND =
  '("Frontend" OR "Front-End" OR "React" OR "Next.js") ' +
  'NOT ("Java" OR "Spring" OR "Angular" OR "Vue")';

// Q2: Full-stack sweet spot — your strongest lane
const Q2_FULLSTACK =
  '("Fullstack" OR "Full Stack" OR "Full-Stack" OR "Node.js" OR "NestJS") ' +
  'NOT ("Java" OR "Spring" OR "Angular" OR "Vue")';

// Q3: Generic titles — startups often post "Software Engineer" or "Web Developer"
// These are invisible to Q1/Q2 but are often perfect React/TS roles
const Q3_GENERIC =
  '("Software Engineer" OR "Web Developer") AND ("React" OR "Next.js" OR "TypeScript")';

// Q4: Java cross-stack — only worth running in local markets
const Q4_JAVA =
  '("Java" OR "Spring Boot") AND ("React" OR "Next.js" OR "Frontend" OR "Fullstack")';

// ─── Markets ─────────────────────────────────────────────────────────────────

// Tier 1 — Local markets (on-site/hybrid allowed per locationReject logic)
const LOCAL_MARKETS = ['Cyprus', 'Malta'];

// Tier 2 — EU individual countries (cleaner than "European Economic Area")
const EU_MARKETS = ['Germany', 'Netherlands', 'Poland', 'Romania', 'Portugal', 'Czech Republic'];

// Tier 3 — Global remote
const GLOBAL_MARKETS = ['Worldwide', 'Ukraine'];

// Tier 4 — US (Remote keyword appended to queries)
const US_MARKETS = ['United States'];

// ─── Build queries ───────────────────────────────────────────────────────────

const localQueries: SearchQuery[] = LOCAL_MARKETS.flatMap((location) => [
  { keywords: Q1_FRONTEND, location },
  { keywords: Q2_FULLSTACK, location },
  { keywords: Q3_GENERIC, location },
  { keywords: Q4_JAVA, location },
]);

const euQueries: SearchQuery[] = EU_MARKETS.flatMap((location) => [
  { keywords: Q1_FRONTEND, location },
  { keywords: Q2_FULLSTACK, location },
  { keywords: Q3_GENERIC, location },
]);

const globalQueries: SearchQuery[] = GLOBAL_MARKETS.flatMap((location) => [
  { keywords: Q1_FRONTEND, location },
  { keywords: Q2_FULLSTACK, location },
  { keywords: Q3_GENERIC, location },
]);

const usQueries: SearchQuery[] = US_MARKETS.flatMap((location) => [
  { keywords: Q1_FRONTEND + ' AND "Remote"', location },
  { keywords: Q2_FULLSTACK + ' AND "Remote"', location },
  { keywords: Q3_GENERIC + ' AND "Remote"', location },
]);

export const SEARCH_QUERIES: SearchQuery[] = [
  ...localQueries,
  ...euQueries,
  ...globalQueries,
  ...usQueries,
];
