# Job Signal Bot

A Playwright-based job discovery pipeline that searches LinkedIn Jobs, deduplicates results, applies rule-based filtering, optionally runs LLM-assisted review, and sends shortlisted roles to Telegram.

## What It Does

- Searches multiple markets and query variants for JavaScript/TypeScript frontend and full-stack roles
- Normalizes and deduplicates overlapping results across queries
- Hard-rejects obvious mismatches such as non-web roles, fake-remote listings, relocation requirements, and wrong-stack jobs
- Scores remaining jobs with rule-based heuristics
- Optionally enriches shortlisted jobs with full descriptions and sends them through an OpenAI model for a second-pass evaluation
- Sends the final digest to Telegram

## Current Target Profile

The default filters are tuned for:

- Frontend and full-stack web roles
- React, Next.js, TypeScript, Node.js, and NestJS
- Remote-first or globally accessible opportunities
- A candidate based in Azerbaijan

If your preferences differ, update:

- `src/linkedin/constants.ts`
- `src/filter/hardReject.ts`
- `src/filter/scorer.ts`
- `src/filter/llmScorer.ts`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local config:

```bash
cp .env.example .env
```

3. Fill in `.env`:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `OPENAI_API_KEY` if you want LLM review
- `LLM_MODEL` defaults to `gpt-5-nano`

4. Save authenticated LinkedIn cookies to:

```text
./data/cookies/linkedin.json
```

5. Optional: place CV/profile context in:

```text
./data/cv/base_cv.txt
```

## Running

Manual pipeline run:

```bash
npm run pipeline
```

Scheduler:

```bash
npm run start
```

Save a fresh LinkedIn session:

```bash
npm run save-session
```

Dry run:

```bash
DRY_RUN=true npm run pipeline
```

## Configuration Notes

- `LINKEDIN_POSTED_WITHIN=r86400` means jobs from the last 24 hours
- `SCORE_HIGH` and `SCORE_MAYBE` control Telegram eligibility
- `MAX_LLM_EVALS_PER_RUN` caps LLM cost
- `.env` overrides the defaults in `src/config.ts`

## Repository Hygiene

Do not commit:

- `.env`
- `data/`
- cookies
- local SQLite files

Rotate any real API keys or bot tokens before publishing a public repo.
