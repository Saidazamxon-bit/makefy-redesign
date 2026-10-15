<?php
require_once __DIR__ . '/../../includes/api_bootstrap.php';
/** Telegram <-> Google/Email ulanishini uzadi (saytdagi "Sozlamalar" tugmasi). */
apiRequireMethod('POST');
$body = apiBody();

if (!apiCsrfVerify($body)) {
    apiError('Xavfsizlik tekshiruvi muvaffaqiyatsiz. Sahifani yangilab, qaytadan urinib ko\'ring.', 'CSRF_INVALID', 403);
}
if (!isLoggedIn()) {
    apiError('Avval tizimga kiring.', 'NOT_AUTHENTICATED', 401);
}

$user = getCurrentUser();
$ok = unlinkTelegramLink($user);
if ($ok && ctype_digit((string)($user['user_id'] ?? ''))) {
    authExtraTelegramSend((string)$user['user_id'], '❌ Google hisob uzildi.');
}
apiJson(['unlinked' => $ok]);
