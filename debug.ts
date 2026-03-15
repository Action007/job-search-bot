import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { config } from './src/config';

async function diagnose() {
  const cookies = JSON.parse(readFileSync(config.LINKEDIN_COOKIES_PATH, 'utf-8'));
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
  });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  
  const url = 'https://www.linkedin.com/jobs/search/?keywords=React%20Developer&location=Cyprus&f_WT=2&f_TPR=r86400&sortBy=DD';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait a bit for React to render
  await new Promise(r => setTimeout(r, 5000));
  
  // Try to find the job list container
  const html = await page.evaluate(() => {
    // Look for common LinkedIn job list containers
    const containers = Array.from(document.querySelectorAll('ul'))
      .filter(ul => ul.textContent?.includes('React') || ul.textContent?.includes('Developer'));
      
    if (containers.length > 0) {
      return containers[0].innerHTML;
    }
    return document.body.innerHTML; 
  });
  
  writeFileSync('debug_linkedin.html', html);
  console.log('HTML saved to debug_linkedin.html');
  await browser.close();
}

diagnose().catch(console.error);
