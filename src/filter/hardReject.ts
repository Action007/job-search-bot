const REJECT_LANGUAGE = [
  'ukrainian language required',
  'fluent ukrainian',
  'ukrainian native',
  'знання української',
  'українська мова',
  'вільне володіння українською',
];

const REJECT_SENIORITY = [
  'junior developer',
  'junior frontend',
  'junior react',
  'junior engineer',
  'entry level',
  'entry-level',
  'internship',
  'intern',
  'fresh graduate',
  'graduate position',
  '0-1 year',
  '0-2 years experience',
  'staff engineer',
  'staff software engineer',
  'principal engineer',
  'principal software engineer',
  'vp of engineering',
  'director of engineering',
  'head of engineering',
  'engineering manager',
  'software engineering manager',
  'cto',
  'chief technology officer',
];

const REJECT_CLEARANCE = [
  'security clearance',
  'active secret clearance',
  'top secret clearance',
  'ts/sci',
  'us citizenship required',
  'must be a us citizen',
  'must be a u.s. citizen',
  'requires u.s. citizenship',
  'only u.s. citizens'
];

const REJECT_RELOCATION = [
  'visa sponsorship required',
  'requires visa sponsorship',
  'must relocate',
  'relocation required',
  'relocate to',
];

const REJECT_STACK = [
  'java developer',
  'java engineer',
  'java software engineer',
  'java full stack developer',
  'java fullstack developer',
  'java backend developer',
  'spring developer',
  'spring engineer',
  'spring boot developer',
  'spring boot engineer',
  'backend developer',
  'backend engineer',
  'back-end developer',
  'back-end engineer',

  'php developer',
  'php engineer',
  'laravel developer',
  'laravel engineer',

  'python developer',
  'python engineer',
  'django developer',
  'django engineer',
  'flask developer',
  'flask engineer',

  'golang developer',
  'golang engineer',
  'go developer',
  'go engineer',

  'ruby on rails',
  'ruby developer',
  'ruby engineer',
  'rails developer',
  'rails engineer',

  '.net developer',
  '.net engineer',
  'c# developer',
  'c# engineer',
  'asp.net developer',
  'asp.net engineer',

  'android developer',
  'android engineer',
  'ios developer',
  'ios engineer',
  'swift developer',
  'swift engineer',
  'flutter developer',
  'flutter engineer',
  'mobile developer',
  'mobile engineer',

  'embedded software',
  'embedded engineer',
  'firmware engineer',
  'firmware developer',
  'privacy engineer',
  'delivery lead',
  'tech consultant',
  'sap ewm',
  'meteorologist',
  'c programmer',
  'c developer',
  'c++ developer',
  'c++ engineer',
  'ux designer',
  'ui designer',
  'rust developer',
  'rust engineer',
  'angular developer',
  'angular engineer',
  'vue developer',
  'vue engineer',
  'data scientist',
  'data engineer',
  'machine learning',
  'ml engineer',
  'ai engineer',
  'qa engineer',
  'qa analyst',
  'qa automation',
  'sdet',
  'systems administrator',
  'devops engineer',
  'site reliability engineer',
  'sre engineer',
  'salesforce developer',
  'servicenow developer',
  'react native developer',
  'react native engineer',
  'react native tech lead',
];

const BACKEND_ONLY_SIGNALS = [
  'java',
  'spring',
  'spring boot',
  'kotlin',
  'scala',
  'hibernate',
];

const REQUIRED_JS_TS_SIGNALS = [
  'javascript',
  'typescript',
  'react',
  'reactjs',
  'next.js',
  'nextjs',
  'node.js',
  'nodejs',
  'nest.js',
  'nestjs',
  'frontend',
  'front-end',
  'fullstack',
  'full stack',
  'full-stack',
];

const REJECT_ONSITE = [
  'on-site',
  'onsite',
  'office-based',
  'in-office',
  'office only',
];

const REJECT_HYBRID = ['hybrid'];
const ALLOWED_LOCAL = ['cyprus', 'malta'];
const REMOTE_SIGNALS = ['remote', 'worldwide', 'global', 'work from anywhere'];

const RESTRICTED_REMOTE_PATTERNS: RegExp[] = [
  /\b(us|usa|united states|canada|uk|united kingdom|germany|poland|netherlands|romania|portugal|czech republic)\s+only\b/,
  /\b(eu|eea|europe)\s+only\b/,
  /remote\s+(within|in|only in)\s+/,
  /must\s+be\s+(based|located|residing)\s+in/,
  /must\s+live\s+in/,
  /must\s+reside\s+in/,
  /must\s+remain\s+in/,
  /currently\s+(located|based)\s+in/,
  /open\s+to\s+candidates\s+(based|located)\s+in/,
  /applications?\s+accepted\s+only\s+from/,
  /authorized\s+to\s+work\s+in/,
  /right\s+to\s+work\s+in/,
  /eligible\s+to\s+work\s+in/,
  /timezone\s*:\s*(gmt|cet|cest|est|pst|mst|uk|eu|europe)/,
];

function languageReject(text: string): boolean {
  return REJECT_LANGUAGE.some((kw) => text.includes(kw));
}

function seniorityReject(text: string): boolean {
  return REJECT_SENIORITY.some((kw) => text.includes(kw));
}

function stackReject(title: string): boolean {
  const t = title.toLowerCase();
  return REJECT_STACK.some((kw) => t.includes(kw));
}

function backendOnlyReject(text: string): boolean {
  const hasPreferredStack =
    /\b(react|reactjs|next\.?js|node\.?js|nodejs|nestjs|nest\.js)\b/.test(text);
  const hasBackendOnlySignal = BACKEND_ONLY_SIGNALS.some((kw) => text.includes(kw));
  return hasBackendOnlySignal && !hasPreferredStack;
}

export function hasRequiredStackSignal(text: string): boolean {
  return REQUIRED_JS_TS_SIGNALS.some((signal) => text.includes(signal));
}

function clearanceReject(text: string): boolean {
  return REJECT_CLEARANCE.some((kw) => text.includes(kw));
}

function relocationReject(text: string): boolean {
  return REJECT_RELOCATION.some((kw) => text.includes(kw));
}

function restrictedRemoteReject(text: string): boolean {
  return RESTRICTED_REMOTE_PATTERNS.some((re) => re.test(text));
}

function locationReject(
  title: string,
  description: string,
  location: string
): boolean {
  const loc = location.toLowerCase();
  const all = (title + ' ' + description + ' ' + location).toLowerCase();

  if (ALLOWED_LOCAL.some((a) => loc.includes(a))) return false;
  if (REJECT_ONSITE.some((kw) => all.includes(kw))) return true;
  if (REJECT_HYBRID.some((kw) => all.includes(kw))) {
    const hasRemoteSignal = REMOTE_SIGNALS.some((rs) => all.includes(rs));
    if (!hasRemoteSignal) return true;
  }

  return false;
}

export function isHardReject(
  title: string,
  description: string,
  location: string
): boolean {
  const text = (title + ' ' + description).toLowerCase();
  return (
    languageReject(text) ||
    seniorityReject(text) ||
    stackReject(title) ||
    backendOnlyReject(text) ||
    clearanceReject(text) ||
    relocationReject(text) ||
    restrictedRemoteReject(text) ||
    locationReject(title, description, location)
  );
}
