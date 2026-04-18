import { SearchQuery } from '../types';

export const SELECTORS = {
  jobCard: '.job-card-container',
  title: '.job-card-list__title--link',
  company: '.artdeco-entity-lockup__subtitle span',
  location: '.job-card-container__metadata-wrapper li span',
  link: '.job-card-list__title--link',
  time: 'time',
  description: '.jobs-description__content, .description__text',
};

const Q1_FRONTEND =
  '("Frontend Developer" OR "Frontend Engineer" OR "Front-End Developer" OR "Front-End Engineer" OR "React Developer" OR "React Engineer") AND ("JavaScript" OR "TypeScript" OR "React" OR "Next.js")';

const Q2_FULLSTACK =
  '("Fullstack Developer" OR "Full Stack Developer" OR "Full-Stack Developer" OR "Fullstack Engineer" OR "Full Stack Engineer" OR "Full-Stack Engineer") AND ("JavaScript" OR "TypeScript" OR "Node.js" OR "NestJS") AND ("React" OR "Next.js")';

const Q3_GENERIC =
  '("Software Engineer" OR "Software Developer" OR "Web Developer") AND ("JavaScript" OR "TypeScript") AND ("React" OR "Next.js" OR "Frontend" OR "Front-End" OR "Fullstack" OR "Full Stack" OR "Full-Stack")';

const Q4_REACT_TS =
  '("React Engineer" OR "React.js Developer" OR "TypeScript Engineer" OR "JavaScript Engineer") AND ("React" OR "Next.js") AND ("JavaScript" OR "TypeScript")';

const Q5_PRODUCT =
  '("Product Engineer" OR "Application Developer" OR "JavaScript Developer" OR "TypeScript Developer") AND ("JavaScript" OR "TypeScript") AND ("React" OR "Next.js" OR "Frontend" OR "Fullstack")';

const Q6_UI_WEB =
  '("UI Developer" OR "UI Engineer" OR "Web Engineer" OR "Frontend Architect") AND ("React" OR "Next.js") AND ("JavaScript" OR "TypeScript")';

const Q7_NODE_REACT =
  '("Node.js Developer" OR "Node.js Engineer" OR "NestJS Developer" OR "NestJS Engineer") AND ("React" OR "Next.js") AND ("JavaScript" OR "TypeScript")';

const LOCAL_MARKETS = ['Cyprus', 'Malta'];
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

const NEARBY_MARKETS = [
  'Georgia',
  'Armenia',
  'Kazakhstan',
  'Serbia',
  'Ukraine',
  'Moldova',
];

const GLOBAL_MARKETS: Array<Pick<SearchQuery, 'location' | 'geoId'>> = [
  { location: 'Worldwide', geoId: '92000000' },
];

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
