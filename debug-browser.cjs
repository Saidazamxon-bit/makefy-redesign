const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });

  page.on('console', (msg) => {
    console.log('BROWSER_CONSOLE:', msg.type(), msg.text());
  });

  page.on('pageerror', (err) => {
    console.log('PAGE_ERROR:', err && err.stack ? err.stack : String(err));
  });

  page.on('requestfailed', (req) => {
    console.log('REQUEST_FAILED:', req.url(), req.failure()?.errorText || 'unknown');
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('HTTP_STATUS:', res.status(), res.url());
    }
  });

  await page.goto('http://localhost:5176/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log('TITLE:', await page.title());
  console.log('URL:', page.url());
  console.log('BODY_SNIPPET:', (await page.locator('body').innerText()).slice(0, 1000));
  await page.screenshot({ path: 'debug-home.png', fullPage: true });
  console.log('SCREENSHOT_OK');

  await browser.close();
})().catch((err) => {
  console.error('OUTER_ERROR:', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
