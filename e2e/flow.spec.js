import { test, expect } from 'playwright/test';
import { createMock } from './mockApi.js';

test.describe('asosiy zanjir', () => {
  test('ro‘yxatdan o‘tish → bot yaratish → xarid → tahlilda ko‘rinishi', async ({ page }) => {
    const mock = createMock();
    await mock.install(page);

    // 1) landing: haqiqiy (API'dan) raqamlar va narxlar
    await page.goto('/');
    await expect(page.getByText('345')).toBeVisible();       // foydalanuvchilar — API'dan
    await expect(page.getByText(/31\s?000/)).toBeVisible();   // Pro narxi — API'dan, qat'iy kodlangan 299 000 emas
    await expect(page.getByText('299 000')).toHaveCount(0);

    // 2) ro'yxatdan o'tish
    await page.goto('/register');
    await page.getByLabel(/login|foydalanuvchi/i).first().fill('tester');
    await page.getByLabel(/parol|password/i).first().fill('Parol12345');
    await page.getByRole('button', { name: /ro.yxatdan|davom|yaratish/i }).first().click();
    await expect(page).toHaveURL(/dashboard/);

    // 3) onboarding ko'rinadi (bot yo'q)
    await expect(page.getByText(/3 qadam|3 steps|3 шага/i)).toBeVisible();

    // 4) bozordan bot yaratish
    await page.goto('/market');
    await page.getByRole('button', { name: /o.rnatish/i }).first().click();
    await page.getByLabel(/token/i).fill('123456789:AAG5wizkGFT__wnQBzoOqr5Sc8LfdHeU2cg');
    await page.getByRole('button', { name: /o.rnatish/i }).last().click();
    await expect(page).toHaveURL(/e2e_starska_bot/);
    expect(mock.state.bots).toHaveLength(1);

    // 5) Web App'da xarid (soxta endpoint buyurtma yaratadi)
    const res = await page.request.post('/api/webapp/action.php', { data: { amal: 'buy' } });
    expect(res.ok()).toBeTruthy();
    expect(mock.state.orders).toHaveLength(1);

    // 6) tahlilda ko'rinishi
    await page.goto('/analytics');
    await expect(page.getByText(/12\s?000/).first()).toBeVisible();
  });

  test('Ctrl+K qidiruv ochiladi va sahifaga o‘tkazadi; Esc yopadi', async ({ page }) => {
    const mock = createMock();
    mock.state.user = { login: 'tester', user_id: '9001', pul: 0, tarif: 'oddiy' };
    await mock.install(page);
    await page.goto('/dashboard');
    await page.keyboard.press('Control+K');
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    await page.keyboard.type('bozor');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/market/);
    await page.keyboard.press('Control+K');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('bildirishnomalar: o‘qilmagan nishon → hammasini o‘qilgan', async ({ page }) => {
    const mock = createMock();
    mock.state.user = { login: 'tester', user_id: '9001', pul: 0, tarif: 'oddiy' };
    await mock.install(page);
    await page.goto('/dashboard');
    const bell = page.getByRole('button', { name: /bildirishnoma|notifications|уведомления/i });
    await expect(bell).toContainText('1');
    await bell.click();
    await page.getByRole('button', { name: /o.qilgan|mark all|прочитан/i }).click();
    await expect(bell).not.toContainText('1');
  });

  test('/status real ma‘lumotni ko‘rsatadi', async ({ page }) => {
    const mock = createMock();
    await mock.install(page);
    await page.goto('/status');
    await expect(page.getByText('99.9%').first()).toBeVisible();
  });

  test('til almashtirish (RU) va 404 sahifa', async ({ page }) => {
    const mock = createMock();
    await mock.install(page);
    await page.addInitScript(() => localStorage.setItem('mf_lang', 'ru'));
    await page.goto('/yoq-sahifa');
    await expect(page.getByText('Страница не найдена')).toBeVisible();
  });
});

test.describe('maket (360 va 1440 px)', () => {
  for (const path of ['/', '/status', '/docs', '/yoq']) {
    test(`gorizontal siljish yo‘q: ${path}`, async ({ page }) => {
      const mock = createMock();
      await mock.install(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
