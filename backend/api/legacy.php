<?php
/**
 * Adapters for the JSON API used by the React/Vercel frontend.
 *
 * The hosting archive predates the frontend API files.  This endpoint keeps
 * the public response contract small and delegates business rules to the
 * existing VisionBuilder/V2 helpers where possible.
 */

require_once __DIR__ . '/../includes/api_bootstrap.php';
require_once ROOT_PATH . '/VisionBuilder/main.php';
require_once ROOT_PATH . '/VisionBuilder/v2/functions.php';
// Telegram "Maker" boti bilan BIR XIL katalog va joylashtirish kodi (SinovMAker/deploy_lib.php)
require_once ROOT_PATH . '/SinovMAker/deploy_lib.php';

global $connect;

function legacyUser(): array
{
    if (!isLoggedIn()) {
        apiError('Avval tizimga kiring.', 'AUTH_REQUIRED', 401);
    }
    $user = getCurrentUser();
    if (empty($user['user_id'])) {
        apiError('Foydalanuvchi sessiyasi topilmadi.', 'AUTH_REQUIRED', 401);
    }
    return $user;
}

function legacyUid(array $user): string
{
    return (string)($user['user_id'] ?? '');
}

function legacyBody(): array
{
    $body = apiBody();
    if (!is_array($body)) {
        apiError('So‘rov ma’lumotlari noto‘g‘ri.', 'INVALID_BODY', 422);
    }
    return $body;
}

function legacyCsrf(array $body): void
{
    if (!apiCsrfVerify($body)) {
        apiError('Sessiya tokeni eskirgan. Qayta urinib ko‘ring.', 'CSRF_INVALID', 419);
    }
}

function legacyEsc(string $value): string
{
    global $connect;
    return mysqli_real_escape_string($connect, $value);
}

function legacyBot(array $user, string $username): ?array
{
    global $connect;
    $uid = legacyEsc(legacyUid($user));
    $name = legacyEsc(ltrim(trim($username), '@'));
    return safe_fetch_assoc(mysqli_query(
        $connect,
        "SELECT * FROM kunlik WHERE user_id='$uid' AND useri='$name' ORDER BY id DESC LIMIT 1"
    ));
}

function legacyBotList(array $user): array
{
    global $connect;
    $uid = legacyEsc(legacyUid($user));
    $rows = [];
    $res = mysqli_query($connect, "SELECT * FROM kunlik WHERE user_id='$uid' ORDER BY id DESC");
    while ($row = safe_fetch_assoc($res)) {
        $username = (string)($row['useri'] ?? '');
        $rows[$username] = $row;
    }

    // Old installations keep usernames in a flat file even when the SQL
    // record is temporarily incomplete.  Preserve those bots in the list.
    $file = ROOT_PATH . '/VisionBuilder/baza/' . legacyUid($user) . '/bots.txt';
    if (is_file($file)) {
        foreach (preg_split('/\r\n|\r|\n/', (string)file_get_contents($file)) as $name) {
            $name = trim($name);
            if ($name !== '' && !isset($rows[$name])) {
                $rows[$name] = ['useri' => $name, 'turi' => 'Legacy', 'kun' => 0, 'vaqti' => ''];
            }
        }
    }
    return array_values($rows);
}

function legacyBotPayload(array $row): array
{
    global $connect;
    $username = (string)($row['useri'] ?? '');
    $botUser = legacyEsc($username);
    $stats = [
        'users' => 0,
        'messages' => 0,
        'records' => 0,
    ];
    $tplManifest = dpl_manifest((string)($row['turi'] ?? ''));
    if ($tplManifest !== null) {
        // Yangi shablonli botlar (AniKino, StarsPro): o'z jadval/fayllaridan statistika
        $st = dpl_stats($connect, (string)$row['turi'], $username);
        $tplInfo = dpl_find_template((string)$row['turi']);
        return [
            'username' => $username,
            'botUser' => $username,
            'useri' => $username,
            'info' => ['turi' => (string)($tplInfo['title'] ?? $row['turi']), 'vaqti' => (string)($row['vaqti'] ?? '')],
            'turi' => (string)($tplInfo['title'] ?? $row['turi']),
            'slug' => (string)$row['turi'],
            'kind' => (string)($tplManifest['kind'] ?? ''),
            'kun' => (int)($row['kun'] ?? 0),
            'narxi' => (float)($row['narxi'] ?? 0),
            'vaqti' => (string)($row['vaqti'] ?? ''),
            'faol' => !empty($row['tokeni']) && (int)($row['kun'] ?? 0) > 0,
            'active' => !empty($row['tokeni']) && (int)($row['kun'] ?? 0) > 0,
            'isV2' => false,
            'isTemplate' => true,
            'canChangeToken' => false,
            'stats' => ['users' => $st['users'], 'messages' => $st['orders'], 'records' => $st['records']],
        ];
    }
    $u = safe_fetch_assoc(mysqli_query($connect, "SELECT COUNT(*) AS n FROM bot_users WHERE bot_user='$botUser'"));
    $o = safe_fetch_assoc(mysqli_query($connect, "SELECT COUNT(*) AS n FROM bot_orders WHERE bot_user='$botUser'"));
    $c = safe_fetch_assoc(mysqli_query($connect, "SELECT COUNT(*) AS n FROM bot_content WHERE bot_user='$botUser'"));
    $stats['users'] = (int)($u['n'] ?? 0);
    $stats['messages'] = (int)($o['n'] ?? 0);
    $stats['records'] = (int)($c['n'] ?? 0);

    return [
        'username' => $username,
        'botUser' => $username,
        'useri' => $username,
        'info' => [
            'turi' => (string)($row['turi'] ?? 'Bot'),
            'vaqti' => (string)($row['vaqti'] ?? ''),
        ],
        'turi' => (string)($row['turi'] ?? 'Bot'),
        'kun' => (int)($row['kun'] ?? 0),
        'narxi' => (float)($row['narxi'] ?? 0),
        'vaqti' => (string)($row['vaqti'] ?? ''),
        'faol' => !empty($row['tokeni']),
        'active' => !empty($row['tokeni']),
        'isV2' => in_array((string)($row['turi'] ?? ''), ['kino', 'stars', 'premium'], true),
        'canChangeToken' => false,
        'stats' => $stats,
    ];
}

function legacyPlan(array $user): array
{
    global $connect;
    return joriyTarif($connect, $user);
}

function legacyAdmin(): void
{
    if (empty($_SESSION['mw_admin']) || $_SESSION['mw_admin'] !== true) {
        apiError('Admin huquqi talab qilinadi.', 'ADMIN_REQUIRED', 403);
    }
}

/** Foydalanuvchining haqiqiy (raqamli) Telegram ID'si: o'z ID'si yoki ulangan Telegram ID; yo'q bo'lsa ''. */
function legacyTelegramId(array $user): string
{
    $uid = legacyUid($user);
    if ($uid !== '' && ctype_digit($uid) && (int)$uid > 0) {
        return $uid;
    }
    $linked = (string)($user['linked_telegram_id'] ?? '');
    if ($linked !== '' && ctype_digit($linked) && (int)$linked > 0) {
        return $linked;
    }
    return '';
}

function legacyBotUsername(): string
{
    $name = ltrim(trim((string)env('BOT_USERNAME', 'Makefybot')), '@');
    return $name !== '' ? $name : 'Makefybot';
}

/**
 * Chat uchun raqamli ID (chat_messages.user_id — BIGINT).
 *  1) Telegram ID (o'z yoki ulangan) — bot chati bilan bir xil suhbat bo'ladi;
 *  2) Google/Email hisobi Telegramga ulanmagan bo'lsa — -kabinet.id (manfiy son,
 *     haqiqiy Telegram ID'lari bilan hech qachon to'qnashmaydi).
 */
function legacyChatUser(array $user): int
{
    $tg = legacyTelegramId($user);
    if ($tg !== '') {
        return (int)$tg;
    }
    $rowId = (int)($user['id'] ?? 0);
    if ($rowId > 0) {
        return -$rowId;
    }
    apiError('Chat uchun hisob identifikatori topilmadi.', 'CHAT_USER_INVALID', 422);
}

function legacyChatPoll(array $user): void
{
    global $connect;
    $uid = legacyChatUser($user);
    chatJadval($connect);
    $after = max(0, (int)($_GET['after'] ?? 0));
    mysqli_query($connect, "UPDATE chat_messages SET oqildi=1, holat='read' WHERE user_id=$uid AND kim='admin' AND oqildi=0");
    $where = $after > 0 ? " AND id>$after" : '';
    $res = mysqli_query($connect, "SELECT * FROM chat_messages WHERE user_id=$uid$where ORDER BY id ASC");
    $messages = [];
    while ($row = safe_fetch_assoc($res)) $messages[] = chatXabarFormat($row);
    $typingRow = safe_fetch_assoc(mysqli_query($connect, "SELECT yangilandi FROM chat_typing WHERE user_id=$uid AND kim='admin'"));
    $typing = $typingRow && strtotime((string)$typingRow['yangilandi']) > time() - 4;
    $plan = chatTarifRuxsat($connect, $user);
    apiJson([
        'messages' => $messages,
        'typing' => $typing,
        'statuses' => [],
        'perms' => ['rasm' => !empty($plan['rasm']), 'video' => false, 'voice' => false, 'tarif' => $plan['tarif'] ?? 'oddiy'],
    ]);
}

function legacyChatSend(array $user): void
{
    global $connect;
    $uid = legacyChatUser($user);
    chatJadval($connect);
    $body = legacyBody();
    legacyCsrf($body);
    $text = trim((string)($body['matn'] ?? ''));
    if ($text === '') apiError('Bo‘sh xabar yuborib bo‘lmaydi.', 'EMPTY_MESSAGE', 422);
    $id = chatYoz($connect, $uid, $text, 'user', ['turi' => 'text', 'holat' => 'sent']);
    // Adminga botda bildirishnoma (eski Chat/api.php dagi kabi) — busiz admin yangi xabarni ko'rmaydi.
    global $orgcoder;
    $adminChat = !empty($orgcoder) ? $orgcoder : (defined('ADMIN_TELEGRAM_ID') ? ADMIN_TELEGRAM_ID : '');
    if ($adminChat !== '' && function_exists('bot')) {
        $who = trim((string)($user['ism'] ?? $user['email'] ?? $user['login'] ?? ''));
        bot('sendMessage', [
            'chat_id' => $adminChat,
            'text' => "💬 Yangi chat\nUser: <code>$uid</code>" . ($who !== '' ? ' · ' . htmlspecialchars($who) : '') . "\n" . htmlspecialchars(mb_substr($text, 0, 200)),
            'parse_mode' => 'html',
        ]);
    }
    mysqli_query($connect, "DELETE FROM chat_typing WHERE user_id=$uid AND kim='user'");
    $row = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM chat_messages WHERE id=" . (int)$id));
    apiJson(['message' => chatXabarFormat($row)]);
}

function legacyStripEmoji(string $s): string
{
    return trim((string)preg_replace('/^[^\p{L}\p{N}]+/u', '', $s));
}

function legacyEmoji(string $s): string
{
    return preg_match('/^([^\p{L}\p{N}\s]+)/u', $s, $m) ? $m[1] : '🤖';
}

/** Backend manzili (SinovMAker papkasi joylashgan asosiy sayt). */
function legacyDeployBase(): string
{
    $app = rtrim((string)APP_URL, '/');
    if ($app === '' || stripos($app, 'example.com') !== false) {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $app = $https . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    }
    return $app . '/SinovMAker';
}

function legacyTemplates(): array
{
    // Katalog Telegramdagi Maker bot bilan umumiy: SinovMAker/bot/<kategoriya>/<bot>/
    $out = [];
    foreach (dpl_catalog() as $t) {
        $out[] = [
            'slug' => $t['slug'],
            'title' => $t['title'],
            'category' => legacyStripEmoji($t['category']),
            'icon' => legacyEmoji($t['category']),
            'description' => $t['description'],
            'price' => $t['price'],
            'dailyFee' => $t['dailyFee'],
            'language' => $t['language'],
            'version' => $t['version'],
            'kind' => $t['kind'],
        ];
    }
    return $out;
}

function legacyCreateTemplate(array $user, string $slug, string $token): array
{
    global $connect;
    $tpl = dpl_find_template($slug);
    if (!$tpl) {
        return ['ok' => false, 'xabar' => 'Bunday bot shabloni mavjud emas.'];
    }
    $tg = legacyTelegramId($user);
    if ($tg === '') {
        return ['ok' => false, 'xabar' => 'Bot yaratish uchun avval Telegram hisobingizni ulang (Profil → Telegramni ulash).'];
    }
    $price = (float)$tpl['price'];
    $balance = (float)($user['pul'] ?? 0);
    if ($balance < $price) {
        return ['ok' => false, 'xabar' => 'Balansingiz yetarli emas. Kerak: ' . number_format($price, 0, '.', ' ') . " so'm."];
    }

    $token = trim(str_replace('%', ':', $token));
    if (!dpl_valid_token($token)) {
        return ['ok' => false, 'xabar' => 'Token formati noto\'g\'ri.'];
    }
    $tokenSafe = legacyEsc($token);
    $existing = safe_fetch_assoc(mysqli_query($connect, "SELECT useri FROM kunlik WHERE tokeni='$tokenSafe' LIMIT 1"));
    if ($existing) {
        return ['ok' => false, 'xabar' => 'Bu bot allaqachon tizimga ulangan.'];
    }
    // Bir foydalanuvchi bir turdan bitta bot (Telegramdagi qoida bilan bir xil)
    $uidSafe = legacyEsc(legacyUid($user));
    $slugSafe = legacyEsc($tpl['slug']);
    $same = safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM kunlik WHERE user_id='$uidSafe' AND turi='$slugSafe' LIMIT 1"));
    if ($same) {
        return ['ok' => false, 'xabar' => 'Sizda bu turdagi bot allaqachon mavjud.'];
    }

    $dep = dpl_deploy($connect, [
        'slug' => $tpl['slug'],
        'token' => $token,
        'owner_id' => $tg,
        'base' => legacyDeployBase(),
    ]);
    if (empty($dep['ok'])) {
        return ['ok' => false, 'xabar' => (string)($dep['xabar'] ?? 'Bot yaratilmadi.')];
    }
    $botUser = (string)$dep['bot_user'];

    $busy = safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM kunlik WHERE useri='" . legacyEsc($botUser) . "' LIMIT 1"));
    if ($busy) {
        // Boshqa foydalanuvchining boti — joylashtirilgan fayllarni o'chirmaymiz (ular egasiniki!)
        return ['ok' => false, 'xabar' => 'Bu bot allaqachon tizimga ulangan.'];
    }
    $registered = dpl_register($connect, [
        'user_id' => legacyUid($user),
        'owner_id' => $tg,
        'bot_user' => $botUser,
        'slug' => $tpl['slug'],
        'token' => $token,
        'daily' => (float)$tpl['dailyFee'],
        'days' => 3,
    ]);
    if (!$registered) {
        dpl_tg($token, 'deleteWebhook');
        return ['ok' => false, 'xabar' => 'Bot ma\'lumotlarini saqlab bo\'lmadi.'];
    }

    if ($price > 0) {
        $newBalance = $balance - $price;
        mysqli_query($connect, "UPDATE kabinet SET pul='$newBalance' WHERE user_id='$uidSafe'");
        addBalanceAudit($connect, legacyUid($user), -$price, 'bot_yaratish', 'Bot: ' . $botUser);
    }

    // Web (VisionBuilder) ro'yxati uchun ham yozamiz
    $dir = ROOT_PATH . '/VisionBuilder/baza/' . legacyUid($user);
    @mkdir($dir, 0777, true);
    $list = is_file($dir . '/bots.txt') ? (string)file_get_contents($dir . '/bots.txt') : '';
    if (!in_array($botUser, array_map('trim', preg_split('/\r\n|\r|\n/', $list)), true)) {
        file_put_contents($dir . '/bots.txt', rtrim($list) . ($list !== '' ? "\n" : '') . $botUser . "\n");
    }

    return [
        'ok' => true,
        'bot_user' => $botUser,
        'kind' => $dep['kind'],
        'panels' => $dep['panels'],
        'admin_login' => $dep['admin_login'],
        'admin_password' => $dep['admin_password'],
    ];
}

$route = (string)($apiVirtualRoute ?? '');
$user = legacyUser();
$uid = legacyUid($user);

switch ($route) {
    case 'balance.php':
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            if (($body['amal'] ?? '') === 'parol_ozgartir') {
                $old = (string)($body['eski_parol'] ?? '');
                $new = (string)($body['yangi_parol'] ?? '');
                $confirm = (string)($body['yangi_parol2'] ?? '');
                $stored = (string)($user['parol'] ?? '');
                $valid = password_get_info($stored)['algo'] !== null
                    ? password_verify($old, $stored)
                    : hash_equals($stored, $old);
                if (!$valid) apiError('Joriy parol noto‘g‘ri.', 'PASSWORD_INVALID', 422);
                if (strlen($new) < 8 || $new !== $confirm) {
                    apiError('Yangi parol talablarga mos emas.', 'PASSWORD_INVALID', 422);
                }
                $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 12]);
                $stmt = mysqli_prepare($connect, 'UPDATE kabinet SET parol=?, parol_ochiq=? WHERE user_id=?');
                mysqli_stmt_bind_param($stmt, 'sss', $hash, $new, $uid);
                mysqli_stmt_execute($stmt);
                mysqli_stmt_close($stmt);
                apiJson(['message' => 'Parol muvaffaqiyatli o‘zgartirildi.']);
            }
            apiError('Noma’lum amal.', 'INVALID_ACTION', 422);
        }
        $plan = legacyPlan($user);
        $level = referalDaraja($connect, $user);
        // 6 xonali foydalanuvchi ID: agar hisobda hali yo'q bo'lsa (masalan migratsiyadan
        // oldin ochilgan), shu yerning o'zida bir marta yaratib saqlaymiz.
        $displayId = (string)($user['foydalanuvchi_id'] ?? '');
        if ($displayId === '' && array_key_exists('foydalanuvchi_id', $user) && function_exists('generateDisplayId')) {
            $displayId = generateDisplayId();
            $stmt = mysqli_prepare($connect, "UPDATE kabinet SET foydalanuvchi_id=? WHERE user_id=? AND (foydalanuvchi_id IS NULL OR foydalanuvchi_id='')");
            mysqli_stmt_bind_param($stmt, 'ss', $displayId, $uid);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
        apiJson([
            'user' => [
                'user_id' => $uid,
                'login' => (string)($user['login'] ?? $user['ism'] ?? ''),
                'balance' => (float)($user['pul'] ?? 0),
                'foydalanuvchi_id' => $displayId,
                'auth_turi' => (string)($user['auth_turi'] ?? 'telegram'),
                'tg_username' => (string)($user['tg_username'] ?? ''),
                'linked_telegram_id' => (string)($user['linked_telegram_id'] ?? ''),
                'linked_tg_username' => (string)($user['linked_tg_username'] ?? ''),
            ],
            'botsCount' => count(legacyBotList($user)),
            'plan' => $plan,
            'referralLevel' => ['name' => $level['name'], 'count' => $level['count'] ?? 0],
        ]);
        break;

    case 'deposit.php':
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            if (($body['amal'] ?? '') !== 'promokod') apiError('Noma’lum amal.', 'INVALID_ACTION', 422);
            $result = promokodIshlat($connect, $user, (string)($body['kod'] ?? ''));
            if (empty($result['ok'])) apiError((string)($result['xabar'] ?? 'Promokod qabul qilinmadi.'), 'PROMO_INVALID', 422);
            $fresh = getCurrentUser();
            apiJson(['message' => $result['xabar'], 'newBalance' => (float)($fresh['pul'] ?? 0)]);
        }
        apiJson([
            'balance' => (float)($user['pul'] ?? 0),
            'cardNumber' => (string)($karta_raqam ?? KARTA_RAQAM),
            'cardOwner' => (string)($karta_egasi ?? KARTA_EGASI),
            'supportUsername' => ltrim((string)env('SUPPORT_USERNAME', 'MakefySupport'), '@'),
        ]);
        break;

    case 'referal.php':
        // Referal bot orqali hisoblanadi (/start <telegram_id>), shuning uchun Telegram ID kerak.
        $refId = legacyTelegramId($user);
        $level = referalDaraja($connect, $refId !== '' ? array_merge($user, ['user_id' => $refId]) : $user);
        $count = (int)($level['count'] ?? 0);
        $levels = [
            ['name' => 'Oddiy', 'min' => 0, 'nomi' => 'Starter'],
            ['name' => 'Starter', 'min' => 1, 'nomi' => 'Pro'],
            ['name' => 'Pro', 'min' => 5, 'nomi' => 'Premium'],
            ['name' => 'Premium', 'min' => 10, 'nomi' => 'VIP'],
            ['name' => 'VIP', 'min' => 20, 'nomi' => 'VIP'],
        ];
        $current = $levels[min((int)($level['level'] ?? 0), 4)];
        $next = $levels[min((int)($level['level'] ?? 0) + 1, 4)];
        $safeUid = legacyEsc($refId !== '' ? $refId : $uid);
        $invited = [];
        $res = mysqli_query($connect, "SELECT r.*, k.ism, k.login FROM referrals r LEFT JOIN kabinet k ON k.user_id=r.referee_id WHERE r.referrer_id='$safeUid' ORDER BY r.id DESC");
        while ($row = safe_fetch_assoc($res)) {
            $invited[] = [
                'ism' => (string)($row['ism'] ?: $row['login'] ?: $row['referee_id']),
                'bonus_berildi' => (string)($row['bonus_berildi'] ?? '0'),
            ];
        }
        $bonus = 1000.0;
        $sum = 0.0;
        foreach ($invited as $item) $sum += (float)$item['bonus_berildi'];
        apiJson([
            'referralLink' => 'https://t.me/' . legacyBotUsername() . ($refId !== '' ? '?start=' . rawurlencode($refId) : ''),
            'needsTelegramLink' => $refId === '',
            'stats' => ['count' => count($invited), 'totalBonus' => $sum, 'activeCount' => count($invited)],
            'level' => ['current' => $current, 'next' => $next, 'raw' => ['level' => (int)($level['level'] ?? 0), 'name' => $level['name'], 'count' => $count]],
            'invited' => $invited,
            'bonusPerReferral' => $bonus,
        ]);
        break;

    case 'tariflar.php':
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            $key = legacyEsc((string)($body['kalit'] ?? ''));
            $plan = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM tariflar WHERE kalit='$key' LIMIT 1"));
            if (!$plan) apiError('Tarif topilmadi.', 'PLAN_NOT_FOUND', 404);
            $price = (float)$plan['narxi'];
            $balance = (float)($user['pul'] ?? 0);
            if ($balance < $price) apiError('Balansingiz yetarli emas.', 'INSUFFICIENT_BALANCE', 422);
            $until = date('Y-m-d', strtotime('+' . max(1, (int)$plan['muddat_kun']) . ' days'));
            $newBalance = $balance - $price;
            $stmt = mysqli_prepare($connect, "UPDATE kabinet SET pul=?, tarif=?, tarif_muddat=? WHERE user_id=?");
            $keyRaw = (string)$plan['kalit'];
            mysqli_stmt_bind_param($stmt, 'dsss', $newBalance, $keyRaw, $until, $uid);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
            addBalanceAudit($connect, $uid, -$price, 'tarif_sotib_olish', 'Tarif: ' . $keyRaw);
            apiJson(['message' => 'Tarif muvaffaqiyatli yoqildi.', 'newBalance' => $newBalance]);
        }
        $plans = barchaTariflar($connect);
        apiJson(['currentPlan' => (string)($user['tarif'] ?? 'oddiy'), 'plans' => $plans]);
        break;

    case 'pulishlash/list.php':
        $safeUid = legacyEsc($uid);
        $pending = [];
        $completed = [];
        $res = mysqli_query($connect, "SELECT p.*, k.nomi, k.username, k.mukofot FROM pulkanal p LEFT JOIN pulkanal k ON k.id=p.id WHERE p.id NOT IN (SELECT kanal_id FROM pulkanal_status WHERE user_id='$safeUid') ORDER BY p.id DESC");
        while ($row = safe_fetch_assoc($res)) $pending[] = ['id' => (int)$row['id'], 'nomi' => $row['nomi'] ?? '', 'username' => $row['username'] ?? '', 'mukofot' => (float)($row['mukofot'] ?? 0)];
        $done = mysqli_query($connect, "SELECT p.*, s.sana FROM pulkanal_status s LEFT JOIN pulkanal p ON p.id=s.kanal_id WHERE s.user_id='$safeUid' ORDER BY s.id DESC");
        while ($row = safe_fetch_assoc($done)) $completed[] = ['id' => (int)$row['id'], 'nomi' => $row['nomi'] ?? '', 'username' => $row['username'] ?? '', 'mukofot' => (float)($row['mukofot'] ?? 0), 'sana' => $row['sana'] ?? ''];
        apiJson(['balance' => (float)($user['pul'] ?? 0), 'pending' => $pending, 'completed' => $completed]);
        break;

    case 'pulishlash/claim.php':
        $body = legacyBody();
        legacyCsrf($body);
        $channelId = (int)($body['kanal_id'] ?? 0);
        $channel = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM pulkanal WHERE id=$channelId LIMIT 1"));
        if (!$channel) apiError('Vazifa topilmadi.', 'TASK_NOT_FOUND', 404);
        $safeUid = legacyEsc($uid);
        $done = safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM pulkanal_status WHERE user_id='$safeUid' AND kanal_id=$channelId LIMIT 1"));
        if ($done) apiError('Bu vazifa avval bajarilgan.', 'TASK_ALREADY_DONE', 422);
        $reward = (float)($channel['mukofot'] ?? 0);
        $newBalance = (float)($user['pul'] ?? 0) + $reward;
        mysqli_query($connect, "INSERT INTO pulkanal_status (user_id,kanal_id,sana) VALUES ('$safeUid',$channelId,NOW())");
        mysqli_query($connect, "UPDATE kabinet SET pul='$newBalance' WHERE user_id='$safeUid'");
        apiJson(['message' => 'Vazifa bajarildi, bonus hisobingizga qo‘shildi.', 'newBalance' => $newBalance]);
        break;

    case 'create/templates.php':
        $templates = legacyTemplates();
        $categories = array_values(array_unique(array_map(static fn($x) => $x['category'], $templates)));
        apiJson(['categories' => $categories, 'templates' => $templates]);
        break;

    case 'create/template_detail.php':
        $slug = strtolower(trim((string)($_GET['nomi'] ?? '')));
        $found = null;
        foreach (legacyTemplates() as $template) if (strcasecmp($template['slug'], $slug) === 0) $found = $template;
        if (!$found) apiError('Shablon topilmadi.', 'TEMPLATE_NOT_FOUND', 404);
        $found['priceOriginal'] = $found['price'];
        $found['discountPercent'] = 0;
        $found['canAfford'] = (float)($user['pul'] ?? 0) >= (float)$found['price'];
        apiJson($found);
        break;

    case 'create/bot_create.php':
        $body = legacyBody();
        legacyCsrf($body);
        $result = legacyCreateTemplate($user, (string)($body['nomi'] ?? ''), (string)($body['token'] ?? ''));
        if (empty($result['ok'])) apiError((string)($result['xabar'] ?? 'Bot yaratilmadi.'), 'BOT_CREATE_FAILED', 422);
        apiJson([
            'botUsername' => $result['bot_user'],
            'alreadyExists' => false,
            'kind' => $result['kind'] ?? null,
            'panels' => $result['panels'] ?? null,
            'adminLogin' => $result['admin_login'] ?? null,
            'adminPassword' => $result['admin_password'] ?? null,
        ]);
        break;

    case 'create/custom_request.php':
        $body = legacyBody();
        legacyCsrf($body);
        $name = trim((string)($body['nomi'] ?? ''));
        $description = trim((string)($body['tavsif'] ?? ''));
        if ($name === '' || $description === '') apiError('Bot nomi va tavsifi kerak.', 'INVALID_REQUEST', 422);
        $stmt = mysqli_prepare($connect, 'INSERT INTO bot_iltimoslar (user_id,login,nomi,tavsif,status,sana) VALUES (?,?,?,?,?,?)');
        $status = 'pending';
        $date = date('d.m.Y H:i');
        mysqli_stmt_bind_param($stmt, 'ssssss', $uid, $user['login'], $name, $description, $status, $date);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        apiJson(['message' => 'Maxsus so‘rovingiz adminga yuborildi.']);
        break;

    case 'mybots/list.php':
        $filter = (string)($_GET['filtr'] ?? 'all');
        $all = [];
        foreach (legacyBotList($user) as $row) {
            // Bazada yozuvi yo'q ("Legacy") eski qoldiqlarni ko'rsatmaymiz — ularni boshqarib bo'lmaydi
            if (($row['turi'] ?? '') === 'Legacy') continue;
            $all[] = legacyBotPayload($row);
        }
        $bots = array_values(array_filter($all, static function ($b) use ($filter) {
            if ($filter === 'active') return !empty($b['faol']);
            if ($filter === 'inactive') return empty($b['faol']);
            return true;
        }));
        apiJson(['bots' => $bots, 'total' => count($bots), 'allTotal' => count($all)]);
        break;

    case 'mybots/actions.php':
        $body = legacyBody();
        legacyCsrf($body);
        $action = (string)($body['amal'] ?? '');
        $botName = ltrim(trim((string)($body['bot_user'] ?? $body['eski_user'] ?? '')), '@');
        $ownedBot = $botName !== '' ? legacyBot($user, $botName) : null;
        $isTemplateBot = $ownedBot && dpl_manifest((string)($ownedBot['turi'] ?? '')) !== null;
        if ($action === 'ochirish') {
            if ($isTemplateBot) {
                $result = dpl_remove($connect, $botName);
                if (!empty($result['ok'])) {
                    $bf = ROOT_PATH . '/VisionBuilder/baza/' . legacyUid($user) . '/bots.txt';
                    if (is_file($bf)) {
                        $keep = array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string)file_get_contents($bf))), static fn($x) => $x !== '' && strcasecmp($x, $botName) !== 0);
                        file_put_contents($bf, $keep ? implode("\n", $keep) . "\n" : '');
                    }
                }
            } else {
                $result = botToliqOchir($connect, $user, $botName);
            }
        } elseif ($action === 'otkazish') {
            $result = $isTemplateBot
                ? ['ok' => false, 'xabar' => 'Bu bot turida egalikni o\'tkazish hozircha mavjud emas.']
                : botEgalikOtkaz($connect, $user, $botName, $body['yangi_egasi_id'] ?? '');
        } elseif ($action === 'token_almashtir') {
            if ($isTemplateBot) {
                if (empty(legacyPlan($user)['token_yangila'])) {
                    $result = ['ok' => false, 'xabar' => 'Tokenni almashtirish tarifingizda mavjud emas.'];
                } else {
                    $result = dpl_change_token($connect, $botName, (string)($body['yangi_token'] ?? ''), legacyDeployBase());
                }
            } else {
                $result = botTokenAlmashtir($connect, $user, $botName, (string)($body['yangi_token'] ?? ''));
            }
            if (!empty($result['bot_user'])) $result['botUser'] = $result['bot_user'];
        } else {
            $result = ['ok' => false, 'xabar' => 'Noma’lum amal.'];
        }
        if (empty($result['ok'])) apiError((string)($result['xabar'] ?? 'Amal bajarilmadi.'), 'BOT_ACTION_FAILED', 422);
        apiJson(['message' => $result['xabar'] ?? 'Amal bajarildi.', 'botUser' => $result['bot_user'] ?? ($result['botUser'] ?? null)]);
        break;

    case 'mybots/detail.php':
        $bot = legacyBot($user, (string)($_GET['useri'] ?? ''));
        if (!$bot) apiError('Bu bot sizga tegishli emas yoki topilmadi.', 'BOT_NOT_FOUND', 404);
        $payload = legacyBotPayload($bot);
        $payload['canChangeToken'] = !empty(legacyPlan($user)['token_yangila']);
        if (!empty($payload['isTemplate'])) {
            $pn = dpl_panels((string)$bot['useri'], legacyDeployBase());
            $payload['panels'] = ['admin' => $pn['adminUrl'], 'app' => $pn['appUrl']];
            $payload['credentials'] = $pn['adminPassword'] ? ['login' => $pn['adminLogin'], 'password' => $pn['adminPassword']] : null;
            $payload['description'] = (string)(dpl_find_template((string)$bot['turi'])['description'] ?? '');
        }
        apiJson($payload);
        break;

    case 'mybots/kunlik_tolov.php':
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            $bot = legacyBot($user, (string)($body['useri'] ?? ''));
            if (!$bot) apiError('Bot topilmadi.', 'BOT_NOT_FOUND', 404);
            $days = max(1, min(365, (int)($body['kunlik'] ?? 1)));
            $daily = (float)($bot['narxi'] ?? 0);
            if ($daily <= 0) $daily = 1000;
            $total = $daily * $days;
            $balance = (float)($user['pul'] ?? 0);
            if ($balance < $total) apiError('Balansingiz yetarli emas.', 'INSUFFICIENT_BALANCE', 422);
            $newBalance = $balance - $total;
            $newDays = (int)($bot['kun'] ?? 0) + $days;
            $id = (int)$bot['id'];
            mysqli_query($connect, "UPDATE kunlik SET kun=$newDays WHERE id=$id");
            mysqli_query($connect, "UPDATE kabinet SET pul='$newBalance' WHERE user_id='" . legacyEsc($uid) . "'");
            addBalanceAudit($connect, $uid, -$total, 'kunlik_tolov', 'Bot: ' . ($bot['useri'] ?? ''));
            apiJson(['message' => 'To‘lov muvaffaqiyatli amalga oshirildi.', 'newBalance' => $newBalance, 'newKun' => $newDays]);
        }
        $bot = legacyBot($user, (string)($_GET['useri'] ?? ''));
        if (!$bot) apiError('Bot topilmadi.', 'BOT_NOT_FOUND', 404);
        apiJson(['kun' => (int)($bot['kun'] ?? 0), 'narxi' => (float)($bot['narxi'] ?? 1000), 'botUser' => $bot['useri']]);
        break;

    case 'bots/settings.php':
        $bot = legacyBot($user, (string)($_REQUEST['useri'] ?? ''));
        if (!$bot || !in_array((string)$bot['turi'], ['kino', 'stars', 'premium'], true)) apiError('V2 bot topilmadi.', 'BOT_NOT_FOUND', 404);
        $botUser = (string)$bot['useri'];
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            v2SettingsSaqlash($connect, $botUser, is_array($body['settings'] ?? null) ? $body['settings'] : []);
            apiJson(['message' => 'Sozlamalar saqlandi.']);
        }
        apiJson(['settings' => v2SettingsOl($connect, $botUser)]);
        break;

    case 'bots/content.php':
        $bot = legacyBot($user, (string)($_REQUEST['useri'] ?? ''));
        if (!$bot || !in_array((string)$bot['turi'], ['kino', 'stars', 'premium'], true)) apiError('V2 bot topilmadi.', 'BOT_NOT_FOUND', 404);
        $botUser = (string)$bot['useri'];
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            if (($body['amal'] ?? '') === 'ochirish') {
                $id = (int)($body['id'] ?? 0);
                dbExecute('DELETE FROM bot_content WHERE id = ? AND bot_user = ?', [$id, $botUser]);
            } else {
                $type = trim((string)($body['turi'] ?? 'custom'));
                $data = is_array($body['data'] ?? null) ? $body['data'] : [];
                $json = json_encode($data, JSON_UNESCAPED_UNICODE);
                $id = (int)($body['id'] ?? 0);
                if ($id > 0) {
                    dbExecute('UPDATE bot_content SET turi=?, data=? WHERE id=? AND bot_user=?', [$type, $json, $id, $botUser]);
                } else {
                    dbExecute('INSERT INTO bot_content (bot_user,turi,data,tartib) VALUES (?,?,?,0)', [$botUser, $type, $json]);
                }
            }
            apiJson(['message' => 'Kontent saqlandi.']);
        }
        $type = (string)($_GET['turi'] ?? v2ContentTuri((string)$bot['turi']));
        apiJson(['items' => v2ContentRoyxat($connect, $botUser, $type)]);
        break;

    case 'bots/broadcast.php':
        $bot = legacyBot($user, (string)($_REQUEST['useri'] ?? ''));
        if (!$bot) apiError('Bot topilmadi.', 'BOT_NOT_FOUND', 404);
        $body = legacyBody();
        legacyCsrf($body);
        $text = trim((string)($body['matn'] ?? ''));
        if ($text === '') apiError('Xabar matni bo‘sh.', 'INVALID_MESSAGE', 422);
        $rows = dbFetchAll('SELECT tg_user_id FROM bot_users WHERE bot_user = ?', [$bot['useri']]);
        $sent = 0;
        foreach ($rows as $row) {
            if (v2BotApi((string)$bot['tokeni'], 'sendMessage', ['chat_id' => (int)$row['tg_user_id'], 'text' => $text])) $sent++;
        }
        apiJson(['message' => "Xabar $sent ta foydalanuvchiga yuborildi.", 'sent' => $sent]);
        break;

    case 'bots/konkurs_draw.php':
        $bot = legacyBot($user, (string)($_REQUEST['useri'] ?? ''));
        if (!$bot) apiError('Bot topilmadi.', 'BOT_NOT_FOUND', 404);
        $body = legacyBody();
        legacyCsrf($body);
        $limit = max(1, min(100, (int)($body['golib_soni'] ?? 1)));
        $rows = dbFetchAll('SELECT id, tg_user_id, ism FROM bot_users WHERE bot_user = ? ORDER BY RAND() LIMIT ' . $limit, [$bot['useri']]);
        apiJson(['winners' => array_map(static fn($r) => ['data' => ['id' => $r['id'], 'user_id' => $r['tg_user_id'], 'ism' => $r['ism']]], $rows)]);
        break;

    case 'chat/poll.php':
        legacyChatPoll($user);
        break;

    case 'chat/typing.php':
        global $connect;
        $uidInt = legacyChatUser($user);
        chatJadval($connect);
        mysqli_query($connect, "INSERT INTO chat_typing (user_id,kim,yangilandi) VALUES ($uidInt,'user',NOW()) ON DUPLICATE KEY UPDATE yangilandi=NOW()");
        apiJson(['message' => 'ok']);
        break;

    case 'chat/send.php':
        legacyChatSend($user);
        break;

    case 'chat/action.php':
        global $connect;
        $body = legacyBody();
        legacyCsrf($body);
        $uidInt = legacyChatUser($user);
        $type = (string)($body['type'] ?? '');
        $id = (int)($body['id'] ?? 0);
        if ($type === 'ilt_pay') $result = iltimosTolov($connect, $id, $uidInt);
        elseif ($type === 'ilt_cancel') $result = iltimosBekor($connect, $id, $uidInt);
        elseif ($type === 'tr_ok') $result = botEgalikAmalgaOshirish($connect, $id, true);
        elseif ($type === 'tr_no') $result = botEgalikAmalgaOshirish($connect, $id, false);
        else $result = ['ok' => false, 'xabar' => 'Noma’lum amal.'];
        if (empty($result['ok'])) apiError((string)($result['xabar'] ?? 'Amal bajarilmadi.'), 'CHAT_ACTION_FAILED', 422);
        apiJson($result);
        break;

    case 'auth/forgot_password.php':
        // Password recovery requires a Telegram-delivered code in the legacy
        // bot.  Keep the session contract safe and explicit instead of
        // pretending that a reset happened without verifying ownership.
        $body = legacyBody();
        legacyCsrf($body);
        apiError('Parolni tiklash kodi Telegram bot orqali yuboriladi.', 'RECOVERY_UNAVAILABLE', 501);
        break;

    case 'webapp/bootstrap.php':
    case 'webapp/action.php':
    case 'webapp/admin_action.php':
        apiError('WebApp endpointi botning initData imzosini talab qiladi.', 'WEBAPP_INITDATA_REQUIRED', 501);
        break;

    case 'admin/dashboard.php':
        legacyAdmin();
        $totalUsers = safe_fetch_assoc(mysqli_query($connect, "SELECT COUNT(*) AS n FROM kabinet"));
        $activeBots = safe_fetch_assoc(mysqli_query($connect, "SELECT COUNT(*) AS n FROM kunlik WHERE tokeni <> ''"));
        $balance = safe_fetch_assoc(mysqli_query($connect, "SELECT COALESCE(SUM(pul),0) AS n FROM kabinet"));
        $pending = safe_fetch_assoc(mysqli_query($connect, "SELECT COUNT(*) AS n FROM bot_iltimoslar WHERE status='pending'"));
        apiJson([
            'stats' => [
                'totalUsers' => (int)($totalUsers['n'] ?? 0),
                'activeBots' => (int)($activeBots['n'] ?? 0),
                'todayUsers' => 0,
                'totalBalance' => (float)($balance['n'] ?? 0),
                'pendingRequests' => (int)($pending['n'] ?? 0),
            ],
            'recentUsers' => [],
            'auditLog' => [],
            'leaderboards' => [],
        ]);
        break;

    case 'admin/kanallar.php':
        legacyAdmin();
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            if (($body['amal'] ?? '') === 'ochirish') {
                dbExecute('DELETE FROM pulkanal WHERE id=?', [(int)($body['id'] ?? 0)]);
            } else {
                dbExecute('INSERT INTO pulkanal (nomi,username,mukofot,sana) VALUES (?,?,?,?)', [
                    (string)($body['nomi'] ?? ''), (string)($body['username'] ?? ''), (string)($body['mukofot'] ?? 0), date('d.m.Y H:i'),
                ]);
            }
            apiJson(['message' => 'Kanal saqlandi.']);
        }
        apiJson(['channels' => dbFetchAll('SELECT * FROM pulkanal ORDER BY id DESC')]);
        break;

    case 'admin/promokodlar.php':
        legacyAdmin();
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            $action = (string)($body['amal'] ?? '');
            $id = (int)($body['id'] ?? 0);
            if ($action === 'ochirish') dbExecute('DELETE FROM promokodlar WHERE id=?', [$id]);
            elseif ($action === 'holat_almashtir') dbExecute('UPDATE promokodlar SET faol=IF(faol=1,0,1) WHERE id=?', [$id]);
            else dbExecute('INSERT INTO promokodlar (kod,soni,mukofot_oddiy,mukofot_pro,mukofot_premium,mukofot_max,faol,sana) VALUES (?,?,?,?,?,?,1,?)', [
                (string)($body['kod'] ?? ''), (int)($body['soni'] ?? 1), (string)($body['mukofot_oddiy'] ?? 0), (string)($body['mukofot_pro'] ?? 0), (string)($body['mukofot_premium'] ?? 0), (string)($body['mukofot_max'] ?? 0), date('d.m.Y H:i'),
            ]);
            apiJson(['message' => 'Promokod saqlandi.']);
        }
        apiJson(['promos' => dbFetchAll('SELECT * FROM promokodlar ORDER BY id DESC')]);
        break;

    case 'admin/sorovlar.php':
        legacyAdmin();
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            $id = (int)($body['id'] ?? 0);
            $status = ($body['amal'] ?? '') === 'rad_etildi' ? 'rejected' : 'delivered';
            dbExecute('UPDATE bot_iltimoslar SET status=?, admin_javob=? WHERE id=?', [$status, (string)($body['izoh'] ?? ''), $id]);
            apiJson(['message' => 'So‘rov yangilandi.']);
        }
        apiJson([
            'requests' => dbFetchAll('SELECT * FROM bot_iltimoslar ORDER BY id DESC'),
            'transfers' => dbFetchAll('SELECT * FROM bot_egalik_ozgarish ORDER BY id DESC'),
        ]);
        break;

    case 'admin/tariflar.php':
        legacyAdmin();
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            $fields = ['nomi','narxi','muddat_kun','chegirma','kunlik_bonus_foiz','referal_bonus_foiz','bot_bonus_kun','otkazish','chat_rasm','chat_voice','token_yangila','webapp_bepul'];
            $sets = [];
            $values = [];
            foreach ($fields as $field) { if (array_key_exists($field, $body)) { $sets[] = "$field=?"; $values[] = $body[$field]; } }
            if ($sets) { $values[] = (int)($body['id'] ?? 0); dbExecute('UPDATE tariflar SET ' . implode(',', $sets) . ' WHERE id=?', $values); }
            apiJson(['message' => 'Tarif saqlandi.']);
        }
        apiJson(['plans' => barchaTariflar($connect)]);
        break;

    case 'admin/turlar.php':
        legacyAdmin();
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $body = legacyBody();
            legacyCsrf($body);
            if (($body['amal'] ?? '') === 'yaratish') dbExecute('INSERT INTO kategoriya (nomi) VALUES (?)', [(string)($body['nomi'] ?? '')]);
            elseif (($body['amal'] ?? '') === 'ochirish') dbExecute('DELETE FROM kategoriya WHERE id=?', [(int)($body['id'] ?? 0)]);
            apiJson(['message' => 'Tur saqlandi.']);
        }
        apiJson(['categories' => dbFetchAll('SELECT * FROM kategoriya ORDER BY id ASC'), 'bots' => []]);
        break;

    default:
        apiError('API endpoint topilmadi.', 'ENDPOINT_NOT_FOUND', 404);
}