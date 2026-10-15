const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (error) => console.log('PAGEERROR:', error.message));
  page.on('requestfailed', (request) => console.log('REQFAIL:', request.url(), request.failure && request.failure().errorText));

  await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log('TITLE:', await page.title());
  console.log('URL:', page.url());
  console.log('HTML:', await page.locator('body').innerText());

  await browser.close();
})();
