// Soxta backend: holatni xotirada saqlaydi, shu bilan "ro'yxatdan o'tish → bot → xarid → tahlil" zanjirini tekshirish mumkin.
export function createMock() {
  const state = { user: null, bots: [], orders: [], notifications: [{ id: 1, kind: 'success', title: "Hisob to'ldirildi", body: "50 000 so'm", link: '/profil', is_read: false, created_at: '2026-10-04 10:00:00' }] };
  const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data, request_id: 'e2e' }) });
  const fail = (status, error, code) => ({ status, contentType: 'application/json', body: JSON.stringify({ ok: false, error, error_code: code, request_id: 'e2e' }) });

  async function install(page) {
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^\/api\//, '').replace(/^\//, '');
      const method = route.request().method();
      const body = method === 'POST' ? (() => { try { return route.request().postDataJSON() || {}; } catch { return {}; } })() : {};

      if (path.startsWith('auth/me')) return route.fulfill(state.user ? ok({ status: 'user', user: state.user, csrfToken: 't' }) : ok({ status: 'guest', csrfToken: 't' }));
      if (path.startsWith('auth/register')) { state.user = { login: body.login || 'tester', user_id: '9001', pul: 100000, tarif: 'oddiy' }; return route.fulfill(ok({ status: 'user', user: state.user })); }
      if (path.startsWith('public_stats')) return route.fulfill(ok({ stats: { bots: 12, users: 345, templates: 2 }, plans: [{ kalit: 'oddiy', nomi: 'Oddiy', narxi: 0, muddat_kun: 0, limits: { max_bots: 2, monthly_messages: 2000 } }, { kalit: 'pro', nomi: 'Pro', narxi: 31000, muddat_kun: 30, limits: { max_bots: 5, monthly_messages: 20000 } }] }));
      if (path.startsWith('status')) return route.fulfill(ok({ overall: 'operational', updated: new Date().toISOString(), incidents: [], components: ['api', 'db', 'queue', 'telegram', 'webhooks'].map((k) => ({ key: k, name: k, state: 'operational', uptime30: 99.9, days: Array.from({ length: 30 }, (_, i) => ({ day: `2026-09-${String(i + 1).padStart(2, '0')}`, uptime: 100 })) })) }));
      if (path.startsWith('notifications/list')) return route.fulfill(ok({ items: state.notifications, unread: state.notifications.filter((n) => !n.is_read).length }));
      if (path.startsWith('notifications/read')) { state.notifications.forEach((n) => { n.is_read = true; }); return route.fulfill(ok({ marked: 1 })); }
      if (path.startsWith('home')) return route.fulfill(ok({ botsCount: state.bots.length, botsPreview: state.bots.map((b) => ({ username: b.useri, ...b })), totals: { users: state.bots.length ? 5 : 0, orders: state.orders.length, revenue: state.orders.reduce((a, o) => a + o.cost, 0) }, byType: {}, alerts: [], user: state.user }));
      if (path.startsWith('market/list')) return route.fulfill(ok({ categories: ['Telegram Stars'], templates: [{ slug: 'starska', title: 'Starska Bot', version: '1.0.0', description: 'Stars, Premium va Gift savdosi', category: 'Telegram Stars', icon: '⭐', price: 0, buttons: [], settings: [], screenshots: [], rating: 4.5, ratingCount: 2 }] }));
      if (path.startsWith('create/bot_create')) { const u = 'e2e_starska_bot'; state.bots.push({ useri: u, turi: 'starska' }); return route.fulfill(ok({ botUsername: u, bot_user: u })); }
      if (path.startsWith('mybots/list')) return route.fulfill(ok({ bots: state.bots.map((b) => ({ username: b.useri, useri: b.useri, botUser: b.useri, faol: true, info: { turi: b.turi } })) }));
      if (path.startsWith('webapp/action')) { state.orders.push({ id: state.orders.length + 1, cost: 12000 }); return route.fulfill(ok({ order: { id: state.orders.length } })); }
      if (path.startsWith('analytics/overview')) {
        const rev = state.orders.reduce((a, o) => a + o.cost, 0);
        const days = Array.from({ length: 30 }, (_, i) => ({ day: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`, new_users: 0, dau: 0, revenue: i === 29 ? rev : 0, orders: i === 29 ? state.orders.length : 0 }));
        const k = (v) => ({ value: v, prev: 0, delta: null });
        return route.fulfill(ok({ range: { from: '2026-09-05', to: '2026-10-04', days: 30, prevFrom: '2026-08-06', prevTo: '2026-09-04' }, hasData: state.orders.length > 0, kpi: { new_users: k(5), revenue: k(rev), orders: k(state.orders.length), dau_avg: k(1), avg_check: k(rev && rev / state.orders.length), payers: k(1), wau: { value: 1 }, mau: { value: 1 } }, series: days, granularity: 'day', funnel: [{ key: 'start', label: 'Start', value: 5 }, { key: 'engaged', label: 'Faol', value: 3 }, { key: 'paid', label: 'Xarid', value: 1 }], heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)), topBots: [], note: '' }));
      }
      if (path.startsWith('client_error')) return route.fulfill(ok({ received: true }));
      return route.fulfill(fail(404, 'mock: ' + path, 'NOT_MOCKED'));
    });
  }
  return { state, install };
}
