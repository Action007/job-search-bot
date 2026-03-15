# 🚀 Running the LinkedIn Job Bot (V2)

With V2 completed, you now have an incredibly powerful AI-assisted job filtering pipeline! The core bot ranks jobs using your base rules, then the GPT-5-Nano LLM reads the job description and your real CV contextually to punish false-positives and reward perfect matches. Finally, it sends these directly to your Telegram with interactive `/save` buttons.

---

## 1. Where to Configure API Keys & Settings

All core dynamic settings live in your `.env` file at the root of the project:
`nano .env`

**Important items to check in `.env`:**
*   `OPENAI_API_KEY`: Ensure your proxy/OpenAI key is pasted here. (I verify it is currently populated in your code).
*   `OPENAI_API_URL`: We set this to `https://api.openai.com/v1`, but you can change it if you route through a custom proxy.
*   `LLM_MODEL`: Set to `gpt-5-nano` by default.
*   `MAX_LLM_EVALS_PER_RUN`: Limits how many jobs the AI evaluates per execution to aggressively control costs (Default: `45`).

---

## 2. Where to Configure Your Profile (CV + Filters)

To get the most out of the V2 LLM Contextual evaluator, you need to configure what jobs it is searching for and who *you* are.

1.  **Your CV Data:**
    Open `data/cv/base_cv.txt` and paste in your raw resume text, project descriptions, or a summary of your skills. The LLM will read this to judge "CV Fit" on shortlisted jobs.
2.  **Scraper Search Queries:**
    Open `src/linkedin/constants.ts` and locate the `SEARCH_QUERIES` array at the bottom. This is where you configure exactly what the Playwright bot types into the LinkedIn search bar (e.g., `keywords: 'Full Stack Node.js TypeScript', location: 'Worldwide'`).
3.  **Rule-Based Keywords (Hard Rejects & Bonuses):**
    Open `src/filter/hardReject.ts` to add non-negotiable reject keywords (e.g., "PHP", "Ruby", "On-site").
    Open `src/filter/scorer.ts` to adjust the baseline points awarded for specific keywords in the job title (e.g., `+15` for React, `+10` for Senior).
4.  **Fake Remote Patterns:**
    Open `src/filter/fakeRemote.ts` to add new regex formulas if you notice companies using new phrases to hide residency requirements.

---

## 3. How to Run the Bot

You have three ways to run the bot depending on your needs.

### Option A: The Automated Background Scheduler (Recommended)
This is how you leave the bot running forever. It will automatically trigger pipeline scrapes at 09:00 UTC and 18:00 UTC every day, and it will continuously poll Telegram so your `/save ab12cd` commands always work.
```bash
npx ts-node src/scheduler.ts
```
*(Tip: In a real server environment, you would run this via `pm2 start npx --name "job-bot" -- ts-node src/scheduler.ts` so it runs infinitely in the background).*

### Option B: A Live Manual Run
If you want to immediately trigger a scrape, LLM evaluation, and get a Telegram digest **right now** without waiting for the scheduled AM/PM hours:
```bash
npx ts-node src/pipeline/index.ts
```

### Option C: A Safe Dry-Run (Testing)
If you are tweaking your scoring rules or LLM prompt, and want to see how the bot scores jobs *without* spamming your Telegram account, run:
```bash
DRY_RUN=true npx ts-node src/pipeline/index.ts
```
