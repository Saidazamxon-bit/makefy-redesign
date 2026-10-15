<?php
require_once __DIR__ . '/../../includes/api_bootstrap.php';
/**
 * Telegram hisobi (Telegram Web App ichida) Google ulash uchun kod oladi.
 * Frontend qaytgan `url`ni tashqi brauzerda ochadi (Google Telegram ichida bloklanishi mumkin).
 */
apiRequireMethod('POST');
$body = apiBody();

if (!apiCsrfVerify($body)) {
    apiError('Xavfsizlik tekshiruvi muvaffaqiyatsiz. Sahifani yangilab, qaytadan urinib ko\'ring.', 'CSRF_INVALID', 403);
}
if (!isLoggedIn()) {
    apiError('Avval tizimga kiring.', 'NOT_AUTHENTICATED', 401);
}

$user = getCurrentUser();
$userId = (string)($user['user_id'] ?? '');
if ($userId === '' || !ctype_digit($userId)) {
    apiError('Bu amal faqat Telegram hisobi uchun.', 'NOT_TELEGRAM_ACCOUNT', 422);
}
if (FRONTEND_URL === '') {
    apiError('Sayt manzili sozlanmagan (FRONTEND_URL).', 'CONFIG_MISSING', 500);
}
$code = createGoogleLinkCode($userId, (string)($user['tg_username'] ?? ''));
apiJson([
    'code' => $code,
    'url' => FRONTEND_URL . '/link?code=' . $code,
    'expiresInSeconds' => 600,
]);
