const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5178', { waitUntil: 'networkidle' });

  const initial = await page.evaluate(() => ({
    htmlTheme: document.documentElement.getAttribute('data-theme'),
    htmlPref: document.documentElement.getAttribute('data-theme-preference'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyText: document.body.innerText.slice(0, 90)
  }));
  console.log('INITIAL=' + JSON.stringify(initial));

  const count = await page.locator('.mf-animated-theme-toggle').count();
  console.log('TOGGLE_COUNT=' + count);
  if (count) {
    await page.locator('.mf-animated-theme-toggle').first().click();
    await page.waitForTimeout(600);
  }

  const after = await page.evaluate(() => ({
    htmlTheme: document.documentElement.getAttribute('data-theme'),
    htmlPref: document.documentElement.getAttribute('data-theme-preference'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlColorScheme: getComputedStyle(document.documentElement).colorScheme,
    className: document.documentElement.className
  }));
  console.log('AFTER=' + JSON.stringify(after));
  await browser.close();
})();
