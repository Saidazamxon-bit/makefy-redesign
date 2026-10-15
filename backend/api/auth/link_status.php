<?php
require_once __DIR__ . '/../../includes/api_bootstrap.php';
/**
 * Joriy hisobning ulanish holati.
 *  mode="web"      — Google/Email hisob: Telegram ulanganmi?
 *  mode="telegram" — Telegram hisob: unga Google hisob ulanganmi?
 */
if (!isLoggedIn()) {
    apiError('Avval tizimga kiring.', 'NOT_AUTHENTICATED', 401);
}
authExtraMigrate();
global $connect;
$user = getCurrentUser();
$userId = (string)($user['user_id'] ?? '');

if ($userId !== '' && ctype_digit($userId)) {
    $stmt = mysqli_prepare($connect, 'SELECT email, ism FROM kabinet WHERE linked_telegram_id = ? AND user_id != ? LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'ss', $userId, $userId);
    mysqli_stmt_execute($stmt);
    $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);
    apiJson([
        'mode' => 'telegram',
        'linked' => (bool)$row,
        'label' => $row ? (string)($row['email'] ?: $row['ism']) : '',
    ]);
}

$tgId = (string)($user['linked_telegram_id'] ?? '');
$tgUser = (string)($user['linked_tg_username'] ?? '');
apiJson([
    'mode' => 'web',
    'linked' => $tgId !== '',
    'label' => $tgId === '' ? '' : ($tgUser !== '' ? '@' . $tgUser : 'ID ' . $tgId),
]);
