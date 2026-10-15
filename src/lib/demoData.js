// Demo rejim uchun to'liq lokal ma'lumotlar ombori (Local Mock Data Store)
// Foydalanuvchi demo login/parol orqali kirib, tizimni to'liq ko'rishi,
// botlarni tahrirlashi, yangi bot qo'shishi va sozlamalarni sinashi mumkin.

const DEMO_STORAGE_KEY = 'makefy_demo_state_v1';
export const DEMO_MODE_KEY = 'makefy_demo_active';

export const DEMO_CREDENTIALS = {
  email: 'demo@makefy.uz',
  password: 'demo',
  role: 'user',
};

const INITIAL_DEMO_STATE = {
  user: {
    id: 999901,
    telegram_id: 999901,
    email: 'demo@makefy.uz',
    ism: 'Demo Boshqaruvchi',
    username: 'makefy_demo_user',
    pul: 285000,
    balans: 285000,
    role: 'user',
    is_demo: true,
    created_at: '2026-01-15 12:00:00',
    telefon: '+998 90 123 45 67',
    til: 'uz',
    tarifi: 'Pro',
  },
  bots: [
    {
      id: 101,
      username: 'smart_market_uz_bot',
      name: 'Smart Market UZ',
      title: 'Smart Market UZ',
      kind: 'shop',
      faol: 1,
      kun: 29,
      status: 'active',
      token: '6123456789:AAH_DemoShopToken_ABC123',
      description: 'Avtomatlashtirilgan internet do‘kon, savat va to‘lov tizimi boti',
      channel: '@smartmarket_uz_channel',
      welcome_text: 'Assalomu alaykum! Smart Market rasmiy botiga xush kelibsiz! Marhamat, katalogdan mahsulot tanlang.',
      auto_accept: true,
      stats: {
        users: 14820,
        orders: 1140,
        revenue: 28450000,
        views: 64200,
      },
    },
    {
      id: 102,
      username: 'kino_olami_premium_bot',
      name: 'Kino Olami HD',
      title: 'Kino Olami HD',
      kind: 'anime',
      faol: 1,
      kun: 18,
      status: 'active',
      token: '6987654321:BBG_DemoCinemaToken_DEF456',
      description: 'Filmlar, yangi seriallar qidiruv va ko‘rish boti',
      channel: '@kino_olami_prem',
      welcome_text: 'Kino Olami botiga xush kelibsiz! Qidirayotgan filmingiz nomi yoki kodini yuboring.',
      auto_accept: false,
      stats: {
        users: 29400,
        orders: 0,
        revenue: 12800000,
        views: 184000,
      },
    },
    {
      id: 103,
      username: 'stars_pay_donat_bot',
      name: 'Stars Donat & Pay',
      title: 'Stars Donat & Pay',
      kind: 'starska',
      faol: 1,
      kun: 12,
      status: 'active',
      token: '6555444333:CCK_DemoStarsToken_GHI789',
      description: 'Telegram Stars va tezkor obuna xizmati',
      channel: '@stars_donat_uz',
      welcome_text: 'Telegram Stars orqali qo‘llab-quvvatlash botiga xush kelibsiz.',
      auto_accept: true,
      stats: {
        users: 3820,
        orders: 490,
        revenue: 4900000,
        views: 12500,
      },
    },
  ],
  activities: [
    { id: 1, title: 'Tizimga kirildi', time: 'Bugun, 10:24', type: 'login', ip: '127.0.0.1 (Demo)' },
    { id: 2, title: '@smart_market_uz_bot sozlamalari yangilandi', time: 'Kecha, 18:40', type: 'bot_update' },
    { id: 3, title: 'Hisob to‘ldirildi (+150 000 so‘m)', time: '12 Oktabr, 14:15', type: 'deposit' },
    { id: 4, title: 'Yangi bot ulandi (@kino_olami_premium_bot)', time: '08 Oktabr, 09:30', type: 'bot_create' },
  ],
  notifications: [
    { id: 1, title: 'Demo rejimga xush kelibsiz!', message: 'Makefy boshqaruv panelining barcha funksiyalarini sinab ko‘rishingiz mumkin.', is_read: false, created_at: '2026-10-14 12:00' },
    { id: 2, title: 'Bot faolligi', message: '@smart_market_uz_bot 14,800+ foydalanuvchiga xizmat ko‘rsatmoqda.', is_read: true, created_at: '2026-10-13 18:00' },
  ],
};

export function getDemoState() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_STATE));
      return INITIAL_DEMO_STATE;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_STATE;
  }
}

export function saveDemoState(state) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Demo holatini saqlashda xatolik:', err);
  }
}

export function isDemoModeActive() {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function activateDemoMode() {
  try {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    // Boshlang'ich holat bo'lmasa yaratamiz
    getDemoState();
    return true;
  } catch {
    return false;
  }
}

export function deactivateDemoMode() {
  try {
    localStorage.removeItem(DEMO_MODE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function resetDemoData() {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_STATE));
    return INITIAL_DEMO_STATE;
  } catch {
    return INITIAL_DEMO_STATE;
  }
}

// Demo so'rovlarni mock qilish mantiqi
export function handleDemoApi(path, { method = 'GET', body = {} } = {}) {
  const state = getDemoState();
  const cleanPath = path.replace(/^\/+/, '').replace(/\.php(?=($|\?))/, '');
  const [route, queryString = ''] = cleanPath.split('?');
  const params = new URLSearchParams(queryString);

  // 1. Auth tekshiruvlari
  if (route === 'auth/me') {
    return {
      authenticated: true,
      role: 'user',
      user: state.user,
      csrfToken: 'demo_token_makefy_2026',
    };
  }

  if (route === 'auth/logout') {
    deactivateDemoMode();
    return { ok: true };
  }

  // 2. Bosh sahifa (Home)
  if (route === 'home') {
    const activeBots = state.bots.filter((b) => b.faol);
    const totalUsers = state.bots.reduce((sum, b) => sum + (b.stats?.users || 0), 0);
    const totalRevenue = state.bots.reduce((sum, b) => sum + (b.stats?.revenue || 0), 0);

    return {
      balance: state.user.pul,
      botsCount: state.bots.length,
      totals: {
        bots: state.bots.length,
        active: activeBots.length,
        users: totalUsers,
        revenue: totalRevenue,
        pending: 0,
      },
      botsPreview: state.bots,
      leaderboard: {
        top: [
          { rank: 1, name: 'Smart Market UZ', users: 14820, growth: '+28%' },
          { rank: 2, name: 'Kino Olami HD', users: 29400, growth: '+15%' },
          { rank: 3, name: 'Stars Donat & Pay', users: 3820, growth: '+41%' },
        ],
      },
      expiring: [],
    };
  }

  // 3. Botlar ro'yxati (MyBots)
  if (route === 'mybots/list') {
    const filter = params.get('filtr') || 'all';
    let filtered = [...state.bots];
    if (filter === 'on') filtered = filtered.filter((b) => b.faol);
    if (filter === 'off') filtered = filtered.filter((b) => !b.faol);
    if (filter === 'shop') filtered = filtered.filter((b) => b.kind === 'shop');
    if (filter === 'anime') filtered = filtered.filter((b) => b.kind === 'anime');
    if (filter === 'starska') filtered = filtered.filter((b) => b.kind === 'starska');

    return {
      bots: filtered,
      total: state.bots.length,
      active: state.bots.filter((b) => b.faol).length,
    };
  }

  // 4. Bot tafsilotlari va sozlamalari
  if (route === 'mybots/detail') {
    const useri = params.get('useri') || params.get('username') || state.bots[0]?.username;
    const bot = state.bots.find((b) => b.username === useri) || state.bots[0];
    return {
      bot,
      settings: {
        token: bot?.token || '6123456789:AAH_DemoToken_XYZ',
        channel: bot?.channel || '@demo_channel',
        welcome_text: bot?.welcome_text || 'Xush kelibsiz!',
        auto_accept: bot?.auto_accept ?? true,
        notify_orders: true,
        currency: 'UZS',
      },
      stats: bot?.stats || { users: 0, revenue: 0 },
    };
  }

  // 5. Bot tarif ma'lumotlari
  if (route === 'mybots/tarif') {
    const useri = params.get('useri') || state.bots[0]?.username;
    const bot = state.bots.find((b) => b.username === useri) || state.bots[0];
    return {
      tarif: bot?.tarif || 'Pro',
      kun: bot?.kun || 30,
      narxi: 65000,
      limits: {
        messages: 'Cheksiz',
        broadcast: '10,000/kun',
        storage: '5 GB',
      },
    };
  }

  // 6. Bot sozlamalarini saqlash / o'zgartirish (POST)
  if (route === 'mybots/update' || route === 'bot/save' || route === 'mybots/save' || route === 'bots/save') {
    const targetUsername = body.username || body.useri;
    let updatedBot = null;
    const newBots = state.bots.map((b) => {
      if (b.username === targetUsername) {
        updatedBot = {
          ...b,
          ...body,
          faol: body.faol !== undefined ? (body.faol ? 1 : 0) : b.faol,
        };
        return updatedBot;
      }
      return b;
    });

    state.bots = newBots;
    state.activities.unshift({
      id: Date.now(),
      title: `@${targetUsername} sozlamalari saqlandi`,
      time: 'Hozirgina',
      type: 'bot_update',
    });
    saveDemoState(state);

    return {
      ok: true,
      message: 'Sozlamalar muvaffaqiyatli saqlandi! (Demo holatda)',
      bot: updatedBot,
    };
  }

  // 7. Yangi bot yaratish (Create)
  if (route === 'create/templates') {
    return {
      templates: [
        { id: 'shop', nomi: 'Online Do‘kon', turi: 'shop', tavsif: 'Katalog, savat, buyurtmalar va to‘lov tizimi', icon: '🛒', narxi: 0 },
        { id: 'anime', nomi: 'Kino va Media Bot', turi: 'anime', tavsif: 'Filmlar kodi, kanallarga obuna va video tarqatish', icon: '🎬', narxi: 0 },
        { id: 'starska', nomi: 'Telegram Stars & Donat', turi: 'starska', tavsif: 'Telegram Stars orqali pullik obunalar va donatlar', icon: '⭐', narxi: 0 },
        { id: 'ai', nomi: 'AI Yordamchi & Chat', turi: 'ai', tavsif: 'ChatGPT / Claude bilan integratsiyalashgan aqlli bot', icon: '🤖', narxi: 50000 },
      ],
    };
  }

  if (route === 'create/template_detail') {
    const slug = params.get('nomi') || 'shop';
    return {
      nomi: slug,
      title: slug === 'shop' ? 'Online Do‘kon' : slug === 'anime' ? 'Kino Bot' : 'AI Yordamchi',
      features: ['Avtomatik qabul qilish', 'To‘lov integratsiyasi', 'Statistika moduli', 'Admin panel'],
      preview_images: [],
    };
  }

  if (route === 'create/save' || route === 'create/bot') {
    const newBot = {
      id: Date.now(),
      username: body.username || `bot_${Math.floor(Math.random() * 8999 + 1000)}_bot`,
      name: body.title || body.name || 'Yangi Demo Bot',
      title: body.title || body.name || 'Yangi Demo Bot',
      kind: body.kind || body.type || 'shop',
      faol: 1,
      kun: 30,
      status: 'active',
      token: body.token || 'demo_token_hash',
      description: body.description || 'Yangi yaratilgan bot',
      channel: body.channel || '@makefy_channel',
      welcome_text: body.welcome_text || 'Assalomu alaykum! Xush kelibsiz.',
      auto_accept: true,
      stats: { users: 1, orders: 0, revenue: 0, views: 5 },
    };
    state.bots.unshift(newBot);
    state.activities.unshift({
      id: Date.now(),
      title: `Yangi bot yaratildi (@${newBot.username})`,
      time: 'Hozirgina',
      type: 'bot_create',
    });
    saveDemoState(state);

    return {
      ok: true,
      message: 'Yangi bot muvaffaqiyatli yaratildi!',
      bot: newBot,
    };
  }

  // 8. Hamyon va to'lovlar (Wallet & Deposit)
  if (route === 'balance' || route === 'deposit') {
    return {
      balance: state.user.pul,
      cards: [
        { id: 1, name: 'Uzcard / Humo', number: '8600 •••• •••• 1234', title: 'Avto-to‘lov' },
        { id: 2, name: 'Payme / Click', number: 'Tezkor to‘lov', title: 'Komissiyasiz' },
      ],
      transactions: [
        { id: 101, turi: 'Kirim', summa: 150000, sana: '12.10.2026', izoh: 'Payme orqali hisob to‘ldirish' },
        { id: 102, turi: 'Chiqim', summa: -45000, sana: '10.10.2026', izoh: 'Bot tarifi uzaytirildi' },
        { id: 103, turi: 'Kirim', summa: 180000, sana: '01.10.2026', izoh: 'Referal mukofoti' },
      ],
    };
  }

  // 9. Tariflar (Plans)
  if (route === 'tariflar' || route === 'plans/overview') {
    return {
      current: 'Pro',
      plans: [
        { kalit: 'free', nomi: 'Boshlang‘ich', narxi: 0, muddat_kun: 30, limits: { max_bots: 1, monthly_messages: 5000 } },
        { kalit: 'pro', nomi: 'Pro', narxi: 65000, muddat_kun: 30, is_featured: true, limits: { max_bots: 5, monthly_messages: 50000 } },
        { kalit: 'vip', nomi: 'VIP Biznes', narxi: 150000, muddat_kun: 30, limits: { max_bots: 20, monthly_messages: 500000 } },
      ],
    };
  }

  // 10. Referal tizimi
  if (route === 'referal') {
    return {
      link: 'https://t.me/Makefybot?start=demo999',
      referals_count: 18,
      earned_total: 240000,
      commission_rate: 15,
      history: [
        { id: 1, user: 'Jasur M.', date: '11.10.2026', bonus: 25000 },
        { id: 2, user: 'Azizbek K.', date: '08.10.2026', bonus: 18000 },
      ],
    };
  }

  // 11. Pul ishlash (Vazifalar)
  if (route === 'pulishlash/list') {
    return {
      tasks: [
        { id: 1, title: 'Telegram kanalimizga obuna bo‘lish', reward: 5000, completed: false, link: 'https://t.me/makefy' },
        { id: 2, title: 'Do‘stlaringizni taklif qiling', reward: 10000, completed: false },
        { id: 3, title: 'Botni baholang', reward: 3000, completed: true },
      ],
    };
  }

  // 12. Profil va faoliyat
  if (route === 'profile/activity') {
    return { items: state.activities };
  }

  if (route === 'profile/name') {
    if (body.ism) {
      state.user.ism = body.ism;
      saveDemoState(state);
    }
    return { ok: true, ism: state.user.ism };
  }

  if (route === 'auth/link_status') {
    return { linked: true, telegram_username: 'demo_user', telegram_id: 999901 };
  }

  if (route === 'notifications/list') {
    return { notifications: state.notifications, unread: 1 };
  }

  if (route === 'analytics/overview') {
    return {
      overview: {
        total_users: 48040,
        active_today: 4320,
        revenue_sum: 46150000,
        retention: '78%',
      },
      charts: {
        daily: [
          { date: '10-08', users: 3100, orders: 45 },
          { date: '10-09', users: 3450, orders: 58 },
          { date: '10-10', users: 3900, orders: 72 },
          { date: '10-11', users: 4120, orders: 85 },
          { date: '10-12', users: 4300, orders: 94 },
          { date: '10-13', users: 4480, orders: 110 },
          { date: '10-14', users: 4820, orders: 128 },
        ],
      },
    };
  }

  if (route === 'chat/poll') {
    return {
      messages: [
        { id: 1, sender: 'support', text: 'Assalomu alaykum! Makefy yordam xizmati. Qanday yordam bera olamiz?', time: '11:00' },
      ],
    };
  }

  // Standart bo'sh/muvaffaqiyatli javob
  return { ok: true, message: 'Amal demo rejimda bajarildi' };
}
