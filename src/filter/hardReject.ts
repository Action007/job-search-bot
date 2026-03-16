// Language rejects
const REJECT_LANGUAGE = [
  'ukrainian language required',
  'fluent ukrainian',
  'ukrainian native',
  'знання української',
  'українська мова',
  'вільне володіння українською',
];

// Seniority rejects
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
  'chief technology officer'
];

// Clearance & Citizenship rejects
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

// Stack rejects (only when these are the primary/only stack)
const REJECT_STACK = [
  'php developer',
  'php engineer',
  'laravel developer',
  'laravel engineer',

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

  // Other specific domain mismatches seen in logs
  'privacy engineer',
  'delivery lead',
  'tech consultant',
  'sap ewm',
  'meteorologist',
  'c programmer',
  'c developer', // Distinct from C#
  'c++ developer',
  'c++ engineer',
  'ux designer',
  'ui designer',
  
  // Additional stacks
  'python developer',
  'python engineer',
  'django developer',
  'golang developer',
  'golang engineer',
  'go developer',
  'go engineer',
  'rust developer',
  'rust engineer',
  'angular developer',
  'angular engineer',
  'vue developer',
  'vue engineer',
  
  // Non-software-dev roles
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
  'servicenow developer'
];

// On-site detection keywords
const REJECT_ONSITE = [
  'on-site',
  'onsite',
  'office-based',
  'in-office',
  'office only',
];

// Hybrid detection keyword
const REJECT_HYBRID = ['hybrid'];

// Cyprus and Malta are the only allowed non-remote locations
const ALLOWED_LOCAL = ['cyprus', 'malta'];

// Remote signals that exempt a job from location-based rejection
const REMOTE_SIGNALS = ['remote', 'worldwide', 'global', 'work from anywhere'];

function languageReject(text: string): boolean {
  return REJECT_LANGUAGE.some((kw) => text.includes(kw));
}

function seniorityReject(text: string): boolean {
  return REJECT_SENIORITY.some((kw) => text.includes(kw));
}

function stackReject(text: string): boolean {
  return REJECT_STACK.some((kw) => text.includes(kw));
}

function clearanceReject(text: string): boolean {
  return REJECT_CLEARANCE.some((kw) => text.includes(kw));
}

function locationReject(
  title: string,
  description: string,
  location: string
): boolean {
  const loc = location.toLowerCase();
  const all = (title + ' ' + description + ' ' + location).toLowerCase();

  // Cyprus/Malta local jobs are always allowed
  if (ALLOWED_LOCAL.some((a) => loc.includes(a))) return false;

  // On-site outside Cyprus/Malta → hard reject
  if (REJECT_ONSITE.some((kw) => all.includes(kw))) return true;

  // Hybrid outside Cyprus/Malta without remote signal → hard reject
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
    stackReject(text) ||
    clearanceReject(text) ||
    locationReject(title, description, location)
  );
}
