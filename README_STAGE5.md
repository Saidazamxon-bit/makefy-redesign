# Frontend — 5-bosqich buyruqlari
```
npm ci
npm run check          # i18n + kontrast + lint + build
npx playwright install chromium
npm run e2e            # mockApi bilan (backend shart emas)
npx lighthouse http://localhost:4173 --preset=perf --form-factor=mobile   # npm run build && npm run preview dan keyin
```
Ma'lumot: backend/BOSQICH_5.md

## 7-bosqich: dizayn sayqali
- `src/styles/polish.css` (yangi, oxirgi ulanadi): raqamlar uchun tabular-nums, yagona karta chuqurligi/hover, tugma `:active`, hero naqshi, tema tokenli skeleton, ingichka skrollbar, mobilda 44px tegish maydoni, chop etish uslubi.
- `index.css`: ulanmagan «Space Grotesk» o'rniga `var(--font-display)` (6 joy) — shrift bir xil chiqadi.
- `lib/api.js`: FormData so'rovlariga `_csrf_token` qo'shiladi.

## 7-bosqich: Telegram Mini App skrinshotlari bo'yicha tuzatishlar (iPhone)
- Yuqori panel: balans bir qatorda, avatar chetdan chiqmaydi (≤520px da wordmark yashiriladi).
- Bildirishnoma paneli telefonda chap chetdan chiqib ketardi → `position:fixed` (12px chetlar).
- `ul[class]/ol[class]` da nuqta/raqam va 40px chekinish (preflight yo'q edi): qidiruv oynasi va onboarding qadamlari tuzaldi.
- `index.css`dagi element reset'lar `@layer base` ichiga olindi: avval `h1–h6{margin:0}` Tailwind `mb-*` ni bosib turardi (qidiruv sarlavhasi input ostida qolardi).
- Pastki navigatsiya: shaffoflik yo'q (orqasidan kartalar ko'rinmaydi), markaziy «Yangi bot» tugmasi tekislandi.
- Hero karta (Telegram/tun rejimi): matn rangi o'qiladigan; faol filtrdagi eski to'q-sariq chegara olib tashlandi.
- Bosh sahifa tezkor kartalardagi «tashqi havola» belgisi → chevron; tokensiz bot nomi «@» o'rniga «Token kiritilmagan».

## 7-bosqich: qayta dizayn
`src/styles/redesign.css` (oxirgi ulanadi): qutilar → ajratgichli bo‘limlar, 4 metrika → bitta qator, tezkor amallar → ro‘yxat, tekis hero, pastki panel ekran tagiga yopishgan. Qaytarish: main.jsx dagi import qatorini o‘chirish.

## 7-bosqich: navigatsiya
4 bo‘lim: Asosiy, Botlar, Hamyon (/hamyon: to‘ldirish, vazifalar, referal, tariflar), Profil. Bot ish maydoni: /bots/:username/* tepasida tablar (Umumiy, Muddat, Jamoa).

## 7-bosqich: skrinshot bo‘yicha 2-tuzatish
Botlar qatori mobilda ixcham (Holat yozuvi ustma-ust tushishi tuzaldi), standart kulrang <button> foni olib tashlandi, KPI ixcham, Profil faktlari ajratgichli ro‘yxat, inglizcha kicker yozuvlar yashirildi.

## Telegram Mini Apps 2.0: to‘liq ekran
`src/lib/telegramFullscreen.js` (requestFullscreen, faqat iOS/Android va Bot API ≥8.0, aks holda expand), `src/styles/safe-area.css` (notch/Dynamic Island/home indicator + Telegram tugmalar paneli). Havola: https://t.me/<bot>/<app>?mode=fullscreen

## Admin: Bot tariflari
`/admin/bot-tariflar` sahifasi (har bot turi uchun tarif narxi, limit, Web App, tezlik, funksiyalar JSON). Eski «Tariflar» → «Umumiy tarif (chegirma)».

## BotDetail dashboard
Holat qatori, limit chiziqlari, tarif tanlash (BotTarif), imkoniyatlar ro‘yxati; Jamoa tabi olib tashlandi.
