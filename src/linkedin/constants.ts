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

// Q1: Frontend roles that explicitly speak JS/TS + React/Next
const Q1_FRONTEND =
  '("Frontend Developer" OR "Frontend Engineer" OR "Front-End Developer" OR "Front-End Engineer" OR "React Developer" OR "React Engineer") AND ("JavaScript" OR "TypeScript" OR "React" OR "Next.js")';

// Q2: Full-stack roles with a clear JS/TS stack
const Q2_FULLSTACK =
  '("Fullstack Developer" OR "Full Stack Developer" OR "Full-Stack Developer" OR "Fullstack Engineer" OR "Full Stack Engineer" OR "Full-Stack Engineer") AND ("JavaScript" OR "TypeScript" OR "Node.js" OR "NestJS") AND ("React" OR "Next.js")';

// Q3: Generic web/software titles, but only when JS/TS + frontend signals are explicit
const Q3_GENERIC =
  '("Software Engineer" OR "Software Developer" OR "Web Developer") AND ("JavaScript" OR "TypeScript") AND ("React" OR "Next.js" OR "Frontend" OR "Front-End" OR "Fullstack" OR "Full Stack" OR "Full-Stack")';

// Q4: Strong React/TypeScript specialist titles
const Q4_REACT_TS =
  '("React Engineer" OR "React.js Developer" OR "TypeScript Engineer" OR "JavaScript Engineer") AND ("React" OR "Next.js") AND ("JavaScript" OR "TypeScript")';

// Q5: Broad product/web software roles that still mention the core stack
const Q5_PRODUCT =
  '("Product Engineer" OR "Application Developer" OR "JavaScript Developer" OR "TypeScript Developer") AND ("JavaScript" OR "TypeScript") AND ("React" OR "Next.js" OR "Frontend" OR "Fullstack")';

// Q6: UI/web-focused frontend roles with explicit JS/TS requirements
const Q6_UI_WEB =
  '("UI Developer" OR "UI Engineer" OR "Web Engineer" OR "Frontend Architect") AND ("React" OR "Next.js") AND ("JavaScript" OR "TypeScript")';

// Q7: Full-stack web roles that explicitly combine React with Node/Nest
const Q7_NODE_REACT =
  '("Node.js Developer" OR "Node.js Engineer" OR "NestJS Developer" OR "NestJS Engineer") AND ("React" OR "Next.js") AND ("JavaScript" OR "TypeScript")';

// ─── Markets ─────────────────────────────────────────────────────────────────

// Tier 1 — Local markets (on-site/hybrid allowed)
const LOCAL_MARKETS = ['Cyprus', 'Malta'];

// Tier 2 — EU individual countries
const EU_MARKETS = [
  'Germany',
  'Netherlands',
  'Poland',
  'Romania',
  'Portugal',
  'Czech Republic',
  'Ireland',
  'Spain',
  'Estonia',
  'Lithuania',
  'Latvia',
  'Greece',
  'Austria',
  'Belgium',
  'Bulgaria',
  'Croatia',
  'Hungary',
  'Slovakia',
  'Slovenia',
  'Finland',
  'Sweden',
  'Denmark',
];

// Tier 3 — Americas with reasonable remote/web hiring activity
const AMERICAS_MARKETS = [
  'United States',
  'Canada',
  'Mexico',
  'Brazil',
  'Argentina',
  'Chile',
  'Colombia',
  'Uruguay',
  'Costa Rica',
];

// Tier 4 — Post-Soviet / nearby markets with some remote-first overlap
const NEARBY_MARKETS = [
  'Georgia',
  'Armenia',
  'Kazakhstan',
  'Serbia',
  'Ukraine',
  'Moldova',
 ];

// Tier 5 — True global remote (explicit LinkedIn geo for Worldwide)
const GLOBAL_MARKETS: Array<Pick<SearchQuery, 'location' | 'geoId'>> = [
  { location: 'Worldwide', geoId: '92000000' },
];

// ─── Build queries ───────────────────────────────────────────────────────────

const localQueries: SearchQuery[] = LOCAL_MARKETS.flatMap((location) => [
  { keywords: Q1_FRONTEND, location },
  { keywords: Q2_FULLSTACK, location },
  { keywords: Q3_GENERIC, location },
  { keywords: Q4_REACT_TS, location },
  { keywords: Q5_PRODUCT, location },
  { keywords: Q6_UI_WEB, location },
  { keywords: Q7_NODE_REACT, location },
]);

const euQueries: SearchQuery[] = EU_MARKETS.flatMap((location) => [
  { keywords: Q1_FRONTEND, location },
  { keywords: Q2_FULLSTACK, location },
  { keywords: Q3_GENERIC, location },
  { keywords: Q4_REACT_TS, location },
  { keywords: Q5_PRODUCT, location },
  { keywords: Q6_UI_WEB, location },
  { keywords: Q7_NODE_REACT, location },
]);

const americasQueries: SearchQuery[] = AMERICAS_MARKETS.flatMap((location) => [
  { keywords: Q1_FRONTEND, location },
  { keywords: Q2_FULLSTACK, location },
  { keywords: Q3_GENERIC, location },
  { keywords: Q4_REACT_TS, location },
  { keywords: Q5_PRODUCT, location },
  { keywords: Q6_UI_WEB, location },
  { keywords: Q7_NODE_REACT, location },
]);

const nearbyQueries: SearchQuery[] = NEARBY_MARKETS.flatMap((location) => [
  { keywords: Q1_FRONTEND, location },
  { keywords: Q2_FULLSTACK, location },
  { keywords: Q3_GENERIC, location },
  { keywords: Q4_REACT_TS, location },
  { keywords: Q5_PRODUCT, location },
  { keywords: Q6_UI_WEB, location },
  { keywords: Q7_NODE_REACT, location },
]);

const globalQueries: SearchQuery[] = GLOBAL_MARKETS.flatMap(({ location, geoId }) => [
  { keywords: Q1_FRONTEND, location, geoId },
  { keywords: Q2_FULLSTACK, location, geoId },
  { keywords: Q3_GENERIC, location, geoId },
  { keywords: Q4_REACT_TS, location, geoId },
  { keywords: Q5_PRODUCT, location, geoId },
  { keywords: Q6_UI_WEB, location, geoId },
  { keywords: Q7_NODE_REACT, location, geoId },
]);

export const SEARCH_QUERIES: SearchQuery[] = [
  ...globalQueries,
  ...localQueries,
  ...euQueries,
  ...americasQueries,
  ...nearbyQueries,
];
