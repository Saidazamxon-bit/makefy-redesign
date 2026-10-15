const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    console.log('BROWSER_CONSOLE:', msg.type(), msg.text());
  });

  page.on('pageerror', (err) => {
    console.log('PAGE_ERROR:', err && err.stack ? err.stack : String(err));
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    console.log('REQUEST_FAILED:', req.url(), failure && failure.errorText ? failure.errorText : 'unknown');
  });

  try {
    await page.goto('http://localhost:4175/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('TITLE:', await page.title());
    console.log('URL:', page.url());
    await page.screenshot({ path: 'debug-home.png', fullPage: true });
    console.log('SCREENSHOT_OK');
  } catch (error) {
    console.log('NAVIGATION_ERROR:', error && error.stack ? error.stack : String(error));
  }

  await browser.close();
})();
