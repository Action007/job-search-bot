import { SearchQuery } from '../types';

export const SELECTORS = {
  jobCard: '.job-card-container',
  baseSearchCard: '.base-card.job-search-card, .base-card.base-search-card',
  title: '.job-card-list__title--link',
  company: '.artdeco-entity-lockup__subtitle span',
  location: '.job-card-container__metadata-wrapper li span',
  link: '.job-card-list__title--link',
  time: 'time',
  description: '.jobs-description__content, .description__text',
};

const MUST_HAVE_STACK =
  '("React" OR "Next.js" OR "NextJS" OR "Node.js" OR "NodeJS" OR "NestJS" OR "Nest.js")';

const Q1_FRONTEND =
  '("Frontend Developer" OR "Frontend Engineer" OR "Front-End Developer" OR "Front-End Engineer" OR "React Developer" OR "React Engineer" OR "Next.js Developer" OR "Next.js Engineer") AND ("React" OR "Next.js" OR "NextJS") AND ("JavaScript" OR "TypeScript")';

const Q2_FULLSTACK =
  '("Fullstack Developer" OR "Full Stack Developer" OR "Full-Stack Developer" OR "Fullstack Engineer" OR "Full Stack Engineer" OR "Full-Stack Engineer" OR "Node.js Developer" OR "NestJS Developer") AND ("Node.js" OR "NodeJS" OR "NestJS" OR "Nest.js") AND ("React" OR "Next.js" OR "NextJS") AND ("JavaScript" OR "TypeScript")';

const Q3_GENERIC =
  '("Software Engineer" OR "Software Developer" OR "Web Developer" OR "Web Engineer") AND ("JavaScript" OR "TypeScript") AND ("React" OR "Next.js" OR "NextJS" OR "Node.js" OR "NodeJS" OR "NestJS" OR "Nest.js") AND ("Frontend" OR "Front-End" OR "Fullstack" OR "Full Stack" OR "Full-Stack" OR "React" OR "Next.js")';

const Q4_REACT_TS =
  '("React Engineer" OR "React.js Developer" OR "React Developer" OR "Next.js Developer" OR "TypeScript Engineer" OR "JavaScript Engineer") AND ("React" OR "Next.js" OR "NextJS") AND ("JavaScript" OR "TypeScript")';

const Q5_PRODUCT =
  '("Frontend Engineer" OR "Frontend Developer" OR "Fullstack Engineer" OR "Fullstack Developer" OR "React Engineer" OR "React Developer") AND ' +
  MUST_HAVE_STACK +
  ' AND ("JavaScript" OR "TypeScript")';

const Q6_UI_WEB =
  '("UI Developer" OR "UI Engineer" OR "Web Engineer" OR "Frontend Architect" OR "Frontend Lead") AND ("React" OR "Next.js" OR "NextJS") AND ("JavaScript" OR "TypeScript")';

const Q7_NODE_REACT =
  '("Node.js Developer" OR "Node.js Engineer" OR "NodeJS Developer" OR "NodeJS Engineer" OR "NestJS Developer" OR "NestJS Engineer" OR "Nest.js Developer" OR "Nest.js Engineer") AND ("React" OR "Next.js" OR "NextJS") AND ("JavaScript" OR "TypeScript")';

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
  'Switzerland',
  'Norway',
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
  'Australia',
];

const NEARBY_MARKETS = [
  'Georgia',
  'Kazakhstan',
  'Serbia',
  'Ukraine',
  'Moldova',
  'Uzbekistan',
  'Turkey',
  'Israel',
  'United Arab Emirates',
  'Singapore',
];

const GLOBAL_MARKETS: Array<Pick<SearchQuery, 'location' | 'geoId'>> = [
  { location: 'Worldwide', geoId: '92000000' },
];

const QUERY_VARIANTS: Array<Pick<SearchQuery, 'id' | 'label' | 'keywords'>> = [
  {
    id: 'frontend-core',
    label: 'Frontend Core',
    keywords: Q1_FRONTEND,
  },
  {
    id: 'fullstack-core',
    label: 'Fullstack Core',
    keywords: Q2_FULLSTACK,
  },
  {
    id: 'generic-web',
    label: 'Generic Web',
    keywords: Q3_GENERIC,
  },
  {
    id: 'react-ts',
    label: 'React + TS',
    keywords: Q4_REACT_TS,
  },
  {
    id: 'react-broad',
    label: 'React Broad',
    keywords: Q5_PRODUCT,
  },
  {
    id: 'ui-web',
    label: 'UI / Web',
    keywords: Q6_UI_WEB,
  },
  {
    id: 'node-react',
    label: 'Node + React',
    keywords: Q7_NODE_REACT,
  },
];

const buildQueries = (
  locations: Array<Pick<SearchQuery, 'location' | 'geoId'>>
): SearchQuery[] =>
  locations.flatMap(({ location, geoId }) =>
    QUERY_VARIANTS.map(({ id, label, keywords }) => ({
      id,
      label,
      keywords,
      location,
      ...(geoId ? { geoId } : {}),
    }))
  );

const localQueries: SearchQuery[] = buildQueries(
  LOCAL_MARKETS.map((location) => ({ location }))
);

const euQueries: SearchQuery[] = buildQueries(
  EU_MARKETS.map((location) => ({ location }))
);

const americasQueries: SearchQuery[] = buildQueries(
  AMERICAS_MARKETS.map((location) => ({ location }))
);

const nearbyQueries: SearchQuery[] = buildQueries(
  NEARBY_MARKETS.map((location) => ({ location }))
);

const globalQueries: SearchQuery[] = buildQueries(GLOBAL_MARKETS);

export const SEARCH_QUERIES: SearchQuery[] = [
  ...globalQueries,
  ...localQueries,
  ...euQueries,
  ...americasQueries,
  ...nearbyQueries,
];
