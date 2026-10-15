# 2-bosqich: React + Vite frontend

## Ishga tushirish (dev)

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_PROXY_TARGET'ni PHP backend manzilingizga moslang
npm run dev
```

`npm run dev` `http://localhost:5173`da ochiladi. `/api/...` so'rovlari
`vite.config.js`dagi proxy orqali `.env`da ko'rsatilgan PHP backendga
uzatiladi — shu sabab CORS bilan ovora bo'lish shart emas, sessiya-cookie
ham bir xil brauzer konteksti ichida to'g'ri ishlaydi.

## Production build

```bash
npm run build
```

`dist/` papkasi hosil bo'ladi — uni cPanel'dagi domeningiz ildiziga
(masalan `public_html/app/`) yuklang. PHP backend (`api/`, `includes/`,
`VisionBuilder/`...) alohida, o'sha serverda ishlab turadi; frontend
faqat undan `/api/...` orqali JSON so'raydi. Ikkalasi bir domenda bo'lsa
eng oddiysi: `dist/` ichidagini domen ildiziga, `api/` papkasini ham
o'sha ildizga (mavjud PHP fayllar bilan bir qatorda) qo'yish — shunda
qo'shimcha CORS sozlash kerak bo'lmaydi.

## Tuzilma

```
src/
  main.jsx              — kirish nuqtasi (Router + AuthProvider)
  App.jsx                — barcha yo'llar (routes)
  index.css              — Tailwind + asl loyihadagi dizayn tokenlari (rang, radius)
  lib/
    api.js                — fetch wrapper (cookie-session + CSRF header)
    format.js             — pul formatlash
  context/
    AuthContext.jsx       — sessiya holati (guest/user/admin), login/logout
  components/
    Layout.jsx             — TopBar + BottomNav + sahifa konteyneri
    TopBar.jsx              — tarif belgisi, balans, profil menyusi
    BottomNav.jsx           — pastki tab-bar (Bosh/Botlarim/Vazifalar/Referal/Profil)
    Guards.jsx              — RequireUser / RequireGuest (auth bo'yicha yo'naltirish)
    ComingSoon.jsx          — hali ko'chirilmagan sahifalar uchun vaqtinchalik komponent
  pages/
    Login.jsx, ForgotPassword.jsx  — to'liq ishlaydi
    Home.jsx                        — to'liq ishlaydi (api/home.php bilan)
    MyBots.jsx, BotDetail.jsx       — to'liq ishlaydi (ro'yxat, amallar, token almashtirish)
    KunlikTolov.jsx                 — to'liq ishlaydi (botning kunlik obunasini uzaytirish)
    Create.jsx                      — to'liq ishlaydi (shablon/maxsus so'rov, token, progress, natija)
    Tariflar.jsx, Deposit.jsx       — to'liq ishlaydi
    Balance.jsx, Referal.jsx        — to'liq ishlaydi
    PulIshlash.jsx                  — to'liq ishlaydi
    Chat.jsx                        — to'liq ishlaydi (polling, rasm, maxsus amallar tugmalari)
    Sozlamalar.jsx                  — to'liq ishlaydi (faqat localStorage)
    admin/
      AdminDashboard.jsx, AdminTariflar.jsx, AdminPromokodlar.jsx,
      AdminKanallar.jsx, AdminTurlar.jsx, AdminSorovlar.jsx,
      AdminChat.jsx, AdminChatSuhbat.jsx    — to'liq ishlaydi
```

## Dizayn

Asl loyihadagi `assets/style.css`dagi barcha rang/radius o'zgaruvchilari
(`--bg`, `--accent`, `--surface`...) `src/index.css`ga aynan ko'chirilgan
va Tailwind utility sifatida ulangan (`bg-surface`, `text-accent`,
`border-border` va h.k. ishlaydi). Tun/kun rejimi almashinuvi ham xuddi
avvalgidek `data-theme` atributi va `localStorage`dagi `mf_tema` kaliti
orqali ishlaydi. Ikonkalar — xuddi asl loyihadagidek Font Awesome (CDN,
`index.html`da ulangan), shrift — Manrope.

## Auth oqimi

1. Ilova ochilganda `AuthProvider` `GET /api/auth/me.php`ni chaqiradi.
2. Javobdan `csrfToken` olinib xotirada saqlanadi (`lib/api.js`).
3. Har bir keyingi POST so'rovga shu token `X-CSRF-Token` header sifatida qo'shiladi.
4. `RequireUser`/`RequireGuest` shu holatga qarab kerakli sahifaga yo'naltiradi.

## `lib/api.js` — FormData qo'llab-quvvatlashi

Odatiy holatda `api.post()` JSON yuboradi. Agar `body` sifatida
`FormData` obyekti uzatilsa (masalan Chat sahifasida rasm biriktirish),
`Content-Type` header qo'yilmaydi — brauzer buni o'zi `multipart/form-data;
boundary=...` bilan avtomatik to'ldiradi. Buni PHP tomonida
`api/chat/send.php` kutadi.

## Qolgan yagona blok

Hozircha hech narsa qolmadi — oddiy foydalanuvchi oqimlari va
**Admin panel** ham to'liq React'da ishlaydi (`/admin/*`, alohida
`AdminLayout` bilan). Bot boshqaruvi (`ManageBot.jsx`) yangi monetizatsiya
arxitekturasidagi uchta shablonni qamrab oladi: Kino, Telegram Stars va
Premium. Har bir tur uchun kontent maydonlari, Stars narxi va admin CRUD
formasi alohida ko'rsatiladi.
