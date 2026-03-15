export const FAKE_REMOTE_PATTERNS: RegExp[] = [
  /remote\s+(within|in|only in)\s+(germany|poland|czech|france|spain|netherlands)/i,
  /must\s+be\s+(based|located|residing)\s+in/i,
  /must\s+have\s+(work\s+authorization|right\s+to\s+work)\s+in/i,
  /candidates\s+must\s+be\s+(eu|eea)\s+(citizens?|residents?)/i,
  /only\s+(eu|eea)\s+(citizens?|residents?)/i,
  /requires?\s+(eu|eea)\s+(citizenship|residency)/i,
  /authorized\s+to\s+work\s+in\s+the\s+(us|usa|united\s+states)/i,
  /no\s+visa\s+sponsorship/i,
  /visa\s+sponsorship\s+not\s+(available|provided)/i,
  /must\s+reside\s+in/i,
  /currently\s+(located|based)\s+in/i,
];

export function isFakeRemote(text: string): boolean {
  return FAKE_REMOTE_PATTERNS.some((re) => re.test(text));
}
