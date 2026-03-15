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
];

// Stack rejects (only when these are the primary/only stack)
const REJECT_STACK = [
  'php developer',
  'laravel developer',
  'ruby on rails',
  'ruby developer',
  'java developer',
  'java engineer',
  'spring boot developer',
  '.net developer',
  'c# developer',
  'asp.net developer',
  'android developer',
  'ios developer',
  'swift developer',
  'flutter developer',
  'embedded software',
  'firmware engineer',
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
    locationReject(title, description, location)
  );
}
