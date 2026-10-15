# Makefy Telegram WebApp architecture

The frontend now exposes two Telegram-native routes:

- `/webapp?bot_id=ID` — end-user WebApp
- `/panel?bot_id=ID` — owner/admin WebApp

Both routes authenticate with Telegram `initData`. The backend validates the HMAC with the **specific bot token**, so one bot cannot read another bot's data.

## Required environment

Set the existing backend `APP_URL` to the deployed frontend URL (Vercel URL/custom domain). The backend uses it when creating the Telegram WebApp menu button and `/panel` link.

The normal bot flow remains:

1. User creates a bot.
2. `kunlik.id` becomes the stable bot/project identifier.
3. The bot webhook continues to use the shared v2 webhook.
4. Telegram menu gets `🌐 Web App`.
5. `/panel` is accepted only from the bot owner and opens the admin WebApp.

Never put bot tokens into the frontend or URL parameters.

## Monetizatsiya

Frontend quyidagi uchta yangi bot turini qo‘llaydi:

- `Kino Bot` — kino katalogi, qidiruv, sevimlilar va pullik kontent.
- `Telegram Stars Bot` — raqamli mahsulotlarni `XTR` invoice orqali sotish.
- `Premium Bot` — oylik, choraklik va yillik Premium tariflarni `XTR` invoice orqali sotish.

To‘lov yaratish backend tomonidan `createInvoiceLink` orqali qilinadi. Telegram
`pre_checkout_query` va `successful_payment` update'lari umumiy v2 webhookda
qabul qilinadi; to‘lovdan keyin `bot_orders` yozuvi yaratiladi va Premium
muddati `bot_users.premium_until`ga yoziladi.

Backend deployidan oldin:

1. `APP_URL`ni Vercel frontend domeniga qo‘ying.
2. MySQL foydalanuvchisida `CREATE/ALTER` huquqi bo‘lsin — v2 jadvallari birinchi update’da yaratiladi.
3. `VisionBuilder/v2/webhook.php` uchun HTTPS domen ishlating.
4. Yangi bot yaratilganda webhook va Telegram `🌐 Web App` menu tugmasi avtomatik sozlanadi.
