export interface RawLinkedInJob {
  title: string | null;
  company: string | null;
  location: string | null;
  url: string | null;
  posted_at: string | null;
  description: string | null;
}

export interface NormalizedJob {
  id: string;
  short_id: string;
  url: string;
  url_hash: string;
  title_co_hash: string;
  title: string;
  company: string;
  location: string;
  description: string | null;
  posted_at: string;
  run_id: string;
}

export interface ScoredJob extends NormalizedJob {
  score: number;
  tier: 'high' | 'maybe' | 'skip' | 'reject';
  stack: string;
}

export interface TelegramDigestItem {
  short_id: string;
  title: string;
  company: string;
  location: string;
  posted_at: string;
  stack: string;
  score: number;
  url: string;
  tier: 'high' | 'maybe';
}

export interface RunStats {
  run_type: 'morning' | 'evening';
  scraped: number;
  sent: number;
  duration: number;
}

export interface SearchQuery {
  keywords: string;
  location: string;
  geoId?: string;
}
