<?php
require_once __DIR__ . '/../../includes/api_bootstrap.php';
/**
 * Botdagi "Google bilan ulash" tugmasi bergan 6 xonali kodni tasdiqlaydi.
 * Frontend /link?code=XXXXXX sahifasi Google bilan kirgandan keyin shuni chaqiradi.
 */
apiRequireMethod('POST');
$body = apiBody();

if (!apiCsrfVerify($body)) {
    apiError('Xavfsizlik tekshiruvi muvaffaqiyatsiz. Sahifani yangilab, qaytadan urinib ko\'ring.', 'CSRF_INVALID', 403);
}
if (!isLoggedIn()) {
    apiError('Avval tizimga kiring.', 'NOT_AUTHENTICATED', 401);
}

$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!checkRateLimit('tg_link_confirm', $ip, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_LOCKOUT_MINUTES)) {
    apiError('Juda ko\'p urinish! Birozdan so\'ng qayta urinib ko\'ring.', 'RATE_LIMITED', 429);
}

$code = preg_replace('/\D/', '', (string)($body['code'] ?? ''));
if (strlen($code) !== 6) {
    apiError('Kod noto\'g\'ri. Botdan yangi kod oling.', 'CODE_INVALID', 422);
}

$user = getCurrentUser();
$result = confirmGoogleLink($code, $user);
if (empty($result['success'])) {
    recordFailedAttempt('tg_link_confirm', $ip);
    apiError((string)$result['error'], 'LINK_FAILED', 422);
}
clearRateLimit('tg_link_confirm', $ip);

$who = (string)($user['email'] ?? $user['ism'] ?? 'Google hisob');
authExtraTelegramSend((string)$result['telegram_id'], '✅ <b>Google hisob ulandi!</b>' . "\n\n" . htmlspecialchars($who) . ' hisobi Telegram akkauntingizga ulandi.');

apiJson([
    'linked' => true,
    'tgUsername' => $result['tg_username'] ?? '',
]);
