# Bot Web App proksisi

Bot Web App/admin sahifalari backend (PHP) da turadi, foydalanuvchi esa faqat frontend domenini ko'radi:

    https://<frontend>/api/bot/<bot_username>/miniapp/   (Starska)   |   .../app/ , .../panel/  (Anime)

- `api/bot/[...path].js` — Vercel funksiyasi; `vercel.json` rewrite'iga TAYANMAYDI (xuddi `/api/*` kabi ishlaydi).
- Eski manzil `/VisionBuilder/bots/<bot>/...` ham `vercel.json` orqali shu funksiyaga yo'naltiriladi.
- Cookie (admin sessiyasi), POST, query-string uzatiladi; backend yo'naltirishlari frontend domeniga o'giriladi;
  backend'ning qattiq CSP/X-Frame headerlari olib tashlanadi.
- **Tekshirish:** brauzerda `https://<frontend>/api/bot/_health` oching →
  `{"proxy":"ok","backendReachable":true,...}` chiqsa funksiya ishlayapti va backend'ga ulanyapti.
  Bot sahifasi javobida `X-Makefy-Upstream-Status` backend javob kodini ko'rsatadi.
- Backend manzili: Vercel → Settings → Environment Variables → `BACKEND_ORIGIN` (ixtiyoriy).
- Cheklov: Vercel funksiyasiga so'rov hajmi ~4.5 MB. Katta video fayllarni admin Web App orqali emas, bot orqali yuklang.
