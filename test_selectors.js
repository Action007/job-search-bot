const fs = require('fs');

const html = fs.readFileSync('debug_linkedin.html', 'utf-8');

const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const document = dom.window.document;

const SELECTORS = {
  jobCard: '.job-card-container',
  title: '.job-card-list__title--link',
  company: '.artdeco-entity-lockup__subtitle span',
  location: '.job-card-container__metadata-wrapper li span',
  link: '.job-card-list__title--link',
  time: 'time',
  // Alternatively for time: '.job-card-container__footer-item--highlighted time'
};

const cards = Array.from(document.querySelectorAll(SELECTORS.jobCard));
console.log(`Found ${cards.length} cards`);

const jobs = cards.slice(0, 3).map(card => {
  return {
    title: card.querySelector(SELECTORS.title)?.textContent?.trim().replace(/\s+/g, ' ') || null,
    company: card.querySelector(SELECTORS.company)?.textContent?.trim().replace(/\s+/g, ' ') || null,
    location: card.querySelector(SELECTORS.location)?.textContent?.trim().replace(/\s+/g, ' ') || null,
    url: card.querySelector(SELECTORS.link)?.href || null,
    posted_at: card.querySelector(SELECTORS.time)?.getAttribute('datetime') || card.querySelector(SELECTORS.time)?.textContent?.trim() || null,
  };
});

console.log(JSON.stringify(jobs, null, 2));
