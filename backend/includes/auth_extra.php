<?php
/**
 * AUTH EXTRA — Telegram Web App va Google orqali avtomatik ro'yxatdan
 * o'tish/kirish. Eski login/parol tizimini (includes/auth.php) buzmaydi,
 * faqat ustiga qo'shimcha kirish usullarini qo'shadi.
 */

if (!defined('AUTH_EXTRA_LOADED')) {
    define('AUTH_EXTRA_LOADED', true);

    require_once __DIR__ . '/auth.php';
    require_once __DIR__ . '/db.php';

    /**
     * `kabinet` jadvaliga Google/ism uchun kerakli ustunlarni qo'shadi
     * (agar ular hali mavjud bo'lmasa). Bir so'rov davomida faqat bir marta ishlaydi.
     */
    function authExtraMigrate(): void {
        global $connect;
        static $done = false;
        if ($done) {
            return;
        }
        $done = true;

        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS google_id VARCHAR(64) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS email VARCHAR(190) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS ism VARCHAR(150) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS tg_username VARCHAR(100) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS auth_turi VARCHAR(20) NOT NULL DEFAULT 'telegram'");
        // Email+parol orqali ro'yxatdan o'tish uchun (ba'zi eski o'rnatishlarda bu
        // ustunlar hali bo'lmasligi mumkin — mavjud bo'lsa, hech narsa o'zgarmaydi).
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS login VARCHAR(190) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS parol VARCHAR(255) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS parol_ochiq VARCHAR(255) NULL");
        // 6 xonali foydalanuvchi ID va Telegram ulash uchun (migrate_google_auth.php ham kerakli ustunlarni qo'shadi)
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS foydalanuvchi_id CHAR(6) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS linked_telegram_id VARCHAR(32) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS linked_tg_username VARCHAR(100) NULL");
        @mysqli_query($connect, "CREATE TABLE IF NOT EXISTS telegram_link_codes (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(12) NOT NULL, user_id VARCHAR(100) NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY idx_tlc_code (code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Telegram tomondan boshlangan "Google ulash" kodlari (bot tugmasi -> sayt /link sahifasi)
        @mysqli_query($connect, "CREATE TABLE IF NOT EXISTS google_link_codes (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(12) NOT NULL, telegram_id VARCHAR(32) NOT NULL, tg_username VARCHAR(100) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY idx_glc_code (code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Unikal indekslar — MySQL "IF NOT EXISTS"ni CREATE INDEX uchun qo'llab-quvvatlamaydi,
        // shuning uchun xatoni (indeks allaqachon mavjud bo'lsa) shunchaki e'tiborsiz qoldiramiz.
        @mysqli_query($connect, "ALTER TABLE kabinet ADD UNIQUE KEY idx_kabinet_google_id (google_id)");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD UNIQUE KEY idx_kabinet_email (email)");
    }

    /**
     * Barcha hisob turlari (Telegram/Google/Email) uchun bitta, oddiy,
     * 6 xonali foydalanuvchi ID yaratadi (profilda "Telegram ID" o'rniga
     * shu ko'rsatiladi — Telegram ID/Google-hash foydalanuvchiga chiqarish
     * uchun mos emas edi).
     */
    function generateDisplayId(): string {
        global $connect;
        for ($attempt = 0; $attempt < 30; $attempt++) {
            $candidate = (string)random_int(100000, 999999);
            $stmt = mysqli_prepare($connect, 'SELECT id FROM kabinet WHERE foydalanuvchi_id = ? LIMIT 1');
            mysqli_stmt_bind_param($stmt, 's', $candidate);
            mysqli_stmt_execute($stmt);
            $exists = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            mysqli_stmt_close($stmt);
            if (!$exists) {
                return $candidate;
            }
        }
        // G'oyat kam ehtimolli holat — barcha urinishlar to'qnashsa, vaqt asosida.
        return (string)(100000 + (time() % 900000));
    }

    /**
     * Telegram akkauntini Google/Email orqali ro'yxatdan o'tgan hisobga
     * ulash uchun bir martalik kod yaratadi (10 daqiqa amal qiladi).
     * Foydalanuvchi bu kodni Makefy botiga "/start link_KOD" ko'rinishida
     * yuboradi (deep link orqali avtomatik).
     */
    function createTelegramLinkCode(string $userId): string {
        global $connect;
        // Avvalgi kodlarini tozalaymiz (bitta faol kod yetarli)
        $del = mysqli_prepare($connect, 'DELETE FROM telegram_link_codes WHERE user_id = ?');
        mysqli_stmt_bind_param($del, 's', $userId);
        mysqli_stmt_execute($del);
        mysqli_stmt_close($del);

        $code = null;
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $candidate = (string)random_int(100000, 999999);
            $check = mysqli_prepare($connect, 'SELECT id FROM telegram_link_codes WHERE code = ? LIMIT 1');
            mysqli_stmt_bind_param($check, 's', $candidate);
            mysqli_stmt_execute($check);
            $exists = mysqli_fetch_assoc(mysqli_stmt_get_result($check));
            mysqli_stmt_close($check);
            if (!$exists) {
                $code = $candidate;
                break;
            }
        }
        if ($code === null) {
            $code = (string)(100000 + random_int(0, 899999));
        }

        $ins = mysqli_prepare($connect, 'INSERT INTO telegram_link_codes (code, user_id) VALUES (?, ?)');
        mysqli_stmt_bind_param($ins, 'ss', $code, $userId);
        mysqli_stmt_execute($ins);
        mysqli_stmt_close($ins);

        return $code;
    }

    /**
     * BOT WEBHOOK'I chaqirishi kerak bo'lgan funksiya: foydalanuvchi botga
     * "/start link_KOD" yuborganda, shu kodni tekshirib, botni yuborgan
     * Telegram foydalanuvchisini web-saytdagi (Google/Email) hisobga ulaydi.
     *
     * Ishlatilishi (bot webhook faylida):
     *   require_once __DIR__ . '/yo\'l/config/config.php';
     *   require_once __DIR__ . '/yo\'l/includes/db.php'; // yoki $connect qayerda ochilsa
     *   require_once __DIR__ . '/yo\'l/includes/auth_extra.php';
     *   $natija = confirmTelegramLink($startParam, $tgUser); // $tgUser = ['id'=>.., 'username'=>..]
     *
     * @param string $code   "/start link_XXXXXX" dagi XXXXXX qismi
     * @param array  $tgUser ['id' => telegram_id, 'username' => tg_username (ixtiyoriy)]
     */
    function confirmTelegramLink(string $code, array $tgUser): array {
        global $connect;
        authExtraMigrate();

        $tgId = (string)($tgUser['id'] ?? '');
        $tgUsername = (string)($tgUser['username'] ?? '');
        if ($code === '' || $tgId === '') {
            return ['success' => false, 'error' => "Ma'lumotlar to'liq emas."];
        }

        $stmt = mysqli_prepare($connect, 'SELECT user_id, created_at FROM telegram_link_codes WHERE code = ? LIMIT 1');
        mysqli_stmt_bind_param($stmt, 's', $code);
        mysqli_stmt_execute($stmt);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if (!$row) {
            return ['success' => false, 'error' => "Kod topilmadi yoki eskirgan. Saytdan yangi kod oling."];
        }
        if (strtotime($row['created_at']) < time() - 600) {
            return ['success' => false, 'error' => "Kod muddati o'tgan (10 daqiqa). Saytdan yangi kod oling."];
        }

        // Bu Telegram hisobi allaqachon BOSHQA hisobga ulanganmi — tekshiramiz
        $check = mysqli_prepare($connect, 'SELECT user_id FROM kabinet WHERE linked_telegram_id = ? AND user_id != ? LIMIT 1');
        mysqli_stmt_bind_param($check, 'ss', $tgId, $row['user_id']);
        mysqli_stmt_execute($check);
        $conflict = mysqli_fetch_assoc(mysqli_stmt_get_result($check));
        mysqli_stmt_close($check);
        if ($conflict) {
            return ['success' => false, 'error' => "Bu Telegram akkaunti allaqachon boshqa hisobga ulangan."];
        }

        $upd = mysqli_prepare($connect, 'UPDATE kabinet SET linked_telegram_id = ?, linked_tg_username = ? WHERE user_id = ?');
        mysqli_stmt_bind_param($upd, 'sss', $tgId, $tgUsername, $row['user_id']);
        mysqli_stmt_execute($upd);
        mysqli_stmt_close($upd);

        $del = mysqli_prepare($connect, 'DELETE FROM telegram_link_codes WHERE code = ?');
        mysqli_stmt_bind_param($del, 's', $code);
        mysqli_stmt_execute($del);
        mysqli_stmt_close($del);

        auditLog('telegram_linked', "Telegram ulandi: $tgId -> " . $row['user_id'], $row['user_id']);

        return ['success' => true, 'user_id' => $row['user_id'], 'telegram_id' => $tgId];
    }

    /** Telegram tomondan "Google ulash" uchun 6 xonali bir martalik kod (10 daqiqa). */
    function createGoogleLinkCode(string $tgId, string $tgUsername = ''): string {
        global $connect;
        authExtraMigrate();
        $del = mysqli_prepare($connect, 'DELETE FROM google_link_codes WHERE telegram_id = ?');
        mysqli_stmt_bind_param($del, 's', $tgId);
        mysqli_stmt_execute($del);
        mysqli_stmt_close($del);

        $code = (string)random_int(100000, 999999);
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $check = mysqli_prepare($connect, 'SELECT id FROM google_link_codes WHERE code = ? LIMIT 1');
            mysqli_stmt_bind_param($check, 's', $code);
            mysqli_stmt_execute($check);
            $exists = mysqli_fetch_assoc(mysqli_stmt_get_result($check));
            mysqli_stmt_close($check);
            if (!$exists) {
                break;
            }
            $code = (string)random_int(100000, 999999);
        }
        $ins = mysqli_prepare($connect, 'INSERT INTO google_link_codes (code, telegram_id, tg_username) VALUES (?, ?, ?)');
        mysqli_stmt_bind_param($ins, 'sss', $code, $tgId, $tgUsername);
        mysqli_stmt_execute($ins);
        mysqli_stmt_close($ins);
        return $code;
    }

    /**
     * Saytga Google/Email orqali kirgan foydalanuvchi bot bergan kodni tasdiqlaydi:
     * kodga bog'langan Telegram akkaunti shu hisobga ulanadi.
     */
    function confirmGoogleLink(string $code, array $user): array {
        global $connect;
        authExtraMigrate();

        $userId = (string)($user['user_id'] ?? '');
        if ($userId === '') {
            return ['success' => false, 'error' => 'Hisob topilmadi.'];
        }
        if (ctype_digit($userId)) {
            return ['success' => false, 'error' => "Siz Telegram hisobi bilan kirgansiz. Bu havolani oddiy brauzerda oching va Google bilan kiring."];
        }
        if (!empty($user['linked_telegram_id'])) {
            return ['success' => false, 'error' => "Bu hisob allaqachon Telegramga ulangan. Avval «Sozlamalar»dan uzing."];
        }

        $stmt = mysqli_prepare($connect, 'SELECT telegram_id, tg_username, created_at FROM google_link_codes WHERE code = ? LIMIT 1');
        mysqli_stmt_bind_param($stmt, 's', $code);
        mysqli_stmt_execute($stmt);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);
        if (!$row) {
            return ['success' => false, 'error' => "Kod topilmadi yoki eskirgan. Botdan yangi kod oling."];
        }
        if (strtotime((string)$row['created_at']) < time() - 600) {
            return ['success' => false, 'error' => "Kod muddati o'tgan (10 daqiqa). Botdan yangi kod oling."];
        }

        $tgId = (string)$row['telegram_id'];
        $check = mysqli_prepare($connect, 'SELECT user_id FROM kabinet WHERE linked_telegram_id = ? AND user_id != ? LIMIT 1');
        mysqli_stmt_bind_param($check, 'ss', $tgId, $userId);
        mysqli_stmt_execute($check);
        $conflict = mysqli_fetch_assoc(mysqli_stmt_get_result($check));
        mysqli_stmt_close($check);
        if ($conflict) {
            return ['success' => false, 'error' => "Bu Telegram akkaunti allaqachon boshqa Google hisobga ulangan."];
        }

        $tgUsername = (string)($row['tg_username'] ?? '');
        $upd = mysqli_prepare($connect, 'UPDATE kabinet SET linked_telegram_id = ?, linked_tg_username = ? WHERE user_id = ?');
        mysqli_stmt_bind_param($upd, 'sss', $tgId, $tgUsername, $userId);
        mysqli_stmt_execute($upd);
        mysqli_stmt_close($upd);

        $del = mysqli_prepare($connect, 'DELETE FROM google_link_codes WHERE code = ?');
        mysqli_stmt_bind_param($del, 's', $code);
        mysqli_stmt_execute($del);
        mysqli_stmt_close($del);

        // Ulanishdan oldin (Telegramsiz) yozilgan chat tarixi ham yangi ID ostiga ko'chadi.
        $rowId = (int)($user['id'] ?? 0);
        if ($rowId > 0) {
            @mysqli_query($connect, 'UPDATE chat_messages SET user_id = ' . (int)$tgId . ' WHERE user_id = ' . (-$rowId));
        }

        auditLog('telegram_linked', "Telegram ulandi (botdan): $tgId -> $userId", $userId);
        return ['success' => true, 'telegram_id' => $tgId, 'tg_username' => $tgUsername];
    }

    /** Hisobdan Telegramni uzadi: Google/Email hisobda o'zining, Telegram hisobda unga ulangan Google hisobning bog'lanishini. */
    function unlinkTelegramLink(array $user): bool {
        global $connect;
        authExtraMigrate();
        $userId = (string)($user['user_id'] ?? '');
        if ($userId === '') {
            return false;
        }
        if (ctype_digit($userId)) {
            $stmt = mysqli_prepare($connect, 'UPDATE kabinet SET linked_telegram_id = NULL, linked_tg_username = NULL WHERE linked_telegram_id = ?');
        } else {
            $stmt = mysqli_prepare($connect, 'UPDATE kabinet SET linked_telegram_id = NULL, linked_tg_username = NULL WHERE user_id = ?');
        }
        mysqli_stmt_bind_param($stmt, 's', $userId);
        mysqli_stmt_execute($stmt);
        $n = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
        auditLog('telegram_unlinked', "Telegram uzildi: $userId", $userId);
        return $n > 0;
    }

    /** Bot orqali Telegram foydalanuvchisiga oddiy xabar yuboradi (xatolik bo'lsa jim o'tadi). */
    function authExtraTelegramSend(string $chatId, string $text): void {
        if ($chatId === '' || !defined('BOT_TOKEN') || BOT_TOKEN === '' || !function_exists('curl_init')) {
            return;
        }
        $ch = curl_init('https://api.telegram.org/bot' . BOT_TOKEN . '/sendMessage');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS => ['chat_id' => $chatId, 'text' => $text, 'parse_mode' => 'html'],
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 6,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }

    /**
     * Telegram Web App `initData` imzosini tekshiradi (HMAC-SHA256, botning
     * o'z tokeni bilan) va tasdiqlangan bo'lsa foydalanuvchi massivini qaytaradi.
     */
    function verifyTelegramInitData(string $initData): ?array {
        if ($initData === '' || !defined('BOT_TOKEN') || BOT_TOKEN === '') {
            return null;
        }
        parse_str($initData, $data);
        if (!isset($data['hash'])) {
            return null;
        }
        $hash = (string)$data['hash'];
        unset($data['hash']);
        ksort($data);

        $pairs = [];
        foreach ($data as $k => $v) {
            $pairs[] = $k . '=' . $v;
        }
        $checkString = implode("\n", $pairs);
        $secretKey = hash_hmac('sha256', BOT_TOKEN, 'WebAppData', true);
        $calcHash = hash_hmac('sha256', $checkString, $secretKey);

        if (!hash_equals($calcHash, $hash)) {
            return null;
        }
        // 24 soatdan eski initData qabul qilinmaydi
        if (isset($data['auth_date']) && (time() - (int)$data['auth_date']) > 86400) {
            return null;
        }
        $user = isset($data['user']) ? json_decode((string)$data['user'], true) : null;
        if (!is_array($user) || empty($user['id'])) {
            return null;
        }
        return $user;
    }

    /**
     * Tasdiqlangan Telegram foydalanuvchisini `kabinet`dan topadi;
     * topilmasa — YANGI HISOBNI AVTOMATIK YARATADI (ro'yxatdan o'tish shart emas).
     */
    function loginOrRegisterTelegramUser(array $tgUser): array {
        global $connect;
        authExtraMigrate();

        $tgId = (string)($tgUser['id'] ?? '');
        if ($tgId === '') {
            return ['success' => false, 'error' => "Telegram ma'lumotlari noto'g'ri."];
        }

        $ism = trim(($tgUser['first_name'] ?? '') . ' ' . ($tgUser['last_name'] ?? ''));
        $tgUsername = (string)($tgUser['username'] ?? '');

        // --- ULANGAN HISOB: agar bu Telegram akkaunti Google/Email hisobiga ulangan bo'lsa,
        // yangi (bo'sh) Telegram hisobi ochmasdan, aynan o'sha hisobga kiramiz. ---
        try {
            $lk = mysqli_prepare($connect, 'SELECT * FROM kabinet WHERE linked_telegram_id = ? AND user_id != ? LIMIT 1');
            if ($lk) {
                mysqli_stmt_bind_param($lk, 'ss', $tgId, $tgId);
                mysqli_stmt_execute($lk);
                $linkedRow = mysqli_fetch_assoc(mysqli_stmt_get_result($lk));
                mysqli_stmt_close($lk);
                if ($linkedRow) {
                    if (!empty($linkedRow['ban']) && $linkedRow['ban'] !== 'unban') {
                        return ['success' => false, 'error' => 'Hisobingiz bloklangan.'];
                    }
                    $upd = mysqli_prepare($connect, 'UPDATE kabinet SET linked_tg_username = ? WHERE user_id = ?');
                    mysqli_stmt_bind_param($upd, 'ss', $tgUsername, $linkedRow['user_id']);
                    mysqli_stmt_execute($upd);
                    mysqli_stmt_close($upd);
                    $linkedRow['linked_tg_username'] = $tgUsername;

                    session_regenerate_id(true);
                    $_SESSION['user_data'] = $linkedRow;
                    $_SESSION['user_id'] = (string)$linkedRow['user_id'];
                    $_SESSION['is_admin'] = false;
                    return ['success' => true, 'user_id' => (string)$linkedRow['user_id'], 'user' => $linkedRow];
                }
            }
        } catch (Throwable $e) {
            // linked_telegram_id ustuni hali yo'q (migratsiya bajarilmagan) — oddiy yo'l bilan davom etamiz
        }

        $stmt = mysqli_prepare($connect, 'SELECT * FROM kabinet WHERE user_id = ? LIMIT 1');
        mysqli_stmt_bind_param($stmt, 's', $tgId);
        mysqli_stmt_execute($stmt);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if (!$row) {
            // --- YANGI FOYDALANUVCHI: avtomatik ro'yxatdan o'tkazamiz ---
            $ins = mysqli_prepare(
                $connect,
                "INSERT INTO kabinet (user_id, pul, pul2, odam, ban, ism, tg_username, auth_turi, foydalanuvchi_id) VALUES (?, '0', '0', '0', 'unban', ?, ?, 'telegram', ?)"
            );
            $displayId = generateDisplayId();
            mysqli_stmt_bind_param($ins, 'ssss', $tgId, $ism, $tgUsername, $displayId);
            mysqli_stmt_execute($ins);
            mysqli_stmt_close($ins);

            $regStr = date('Y-m-d') . ' | ' . date('H:i');
            $insU = mysqli_prepare($connect, 'INSERT INTO user_id (user_id, reg) VALUES (?, ?)');
            mysqli_stmt_bind_param($insU, 'ss', $tgId, $regStr);
            mysqli_stmt_execute($insU);
            mysqli_stmt_close($insU);

            $stmt2 = mysqli_prepare($connect, 'SELECT * FROM kabinet WHERE user_id = ? LIMIT 1');
            mysqli_stmt_bind_param($stmt2, 's', $tgId);
            mysqli_stmt_execute($stmt2);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt2));
            mysqli_stmt_close($stmt2);

            auditLog('telegram_auto_register', "Telegram orqali avtomatik ro'yxatdan o'tdi: $tgId", $tgId);
        } else {
            // Mavjud foydalanuvchi — ism/username Telegram'dagi joriy qiymatlarga yangilanadi
            $upd = mysqli_prepare($connect, 'UPDATE kabinet SET ism = ?, tg_username = ? WHERE user_id = ?');
            mysqli_stmt_bind_param($upd, 'sss', $ism, $tgUsername, $tgId);
            mysqli_stmt_execute($upd);
            mysqli_stmt_close($upd);
            $row['ism'] = $ism;
            $row['tg_username'] = $tgUsername;
        }

        if (!$row) {
            return ['success' => false, 'error' => "Hisob yaratib bo'lmadi. Qaytadan urinib ko'ring."];
        }
        if (!empty($row['ban']) && $row['ban'] !== 'unban') {
            return ['success' => false, 'error' => 'Hisobingiz bloklangan.'];
        }

        session_regenerate_id(true);
        $_SESSION['user_data'] = $row;
        $_SESSION['user_id'] = $tgId;
        $_SESSION['is_admin'] = false;
        return ['success' => true, 'user_id' => $tgId, 'user' => $row];
    }

    /**
     * Tasdiqlangan Google foydalanuvchisini (JWT payload) `kabinet`dan topadi
     * (avval google_id, keyin email bo'yicha — eski hisobga bog'lash uchun);
     * topilmasa — YANGI HISOBNI AVTOMATIK YARATADI.
     */
    function loginOrRegisterGoogleUser(array $payload): array {
        global $connect;
        authExtraMigrate();

        $sub = (string)($payload['sub'] ?? '');
        $email = (string)($payload['email'] ?? '');
        $emailVerified = ($payload['email_verified'] ?? false);
        $emailVerified = $emailVerified === true || $emailVerified === 'true' || $emailVerified === 1;
        $name = (string)($payload['name'] ?? '');
        $picture = (string)($payload['picture'] ?? '');

        if ($sub === '' || $email === '' || !$emailVerified) {
            return ['success' => false, 'error' => "Google hisobi tasdiqlanmagan yoki email berilmagan."];
        }

        $row = null;
        $stmt = mysqli_prepare($connect, 'SELECT * FROM kabinet WHERE google_id = ? LIMIT 1');
        mysqli_stmt_bind_param($stmt, 's', $sub);
        mysqli_stmt_execute($stmt);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if (!$row) {
            // Bir xil email bilan avvaldan (masalan login/parol orqali) yaratilgan hisob bo'lsa — bog'laymiz
            $stmt = mysqli_prepare($connect, 'SELECT * FROM kabinet WHERE email = ? LIMIT 1');
            mysqli_stmt_bind_param($stmt, 's', $email);
            mysqli_stmt_execute($stmt);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            mysqli_stmt_close($stmt);

            if ($row) {
                $upd = mysqli_prepare($connect, 'UPDATE kabinet SET google_id = ? WHERE user_id = ?');
                mysqli_stmt_bind_param($upd, 'ss', $sub, $row['user_id']);
                mysqli_stmt_execute($upd);
                mysqli_stmt_close($upd);
                $row['google_id'] = $sub;
            }
        }

        if (!$row) {
            // --- YANGI FOYDALANUVCHI: sun'iy (Telegram bo'lmagan) user_id bilan avtomatik ro'yxatdan o'tkazamiz ---
            $newUserId = googleGenerateUserId($sub);

            $ins = mysqli_prepare(
                $connect,
                "INSERT INTO kabinet (user_id, pul, pul2, odam, ban, ism, email, google_id, avatar_url, auth_turi, foydalanuvchi_id) VALUES (?, '0', '0', '0', 'unban', ?, ?, ?, ?, 'google', ?)"
            );
            $displayId = generateDisplayId();
            mysqli_stmt_bind_param($ins, 'ssssss', $newUserId, $name, $email, $sub, $picture, $displayId);
            mysqli_stmt_execute($ins);
            mysqli_stmt_close($ins);

            $regStr = date('Y-m-d') . ' | ' . date('H:i');
            $insU = mysqli_prepare($connect, 'INSERT INTO user_id (user_id, reg) VALUES (?, ?)');
            mysqli_stmt_bind_param($insU, 'ss', $newUserId, $regStr);
            mysqli_stmt_execute($insU);
            mysqli_stmt_close($insU);

            $stmt2 = mysqli_prepare($connect, 'SELECT * FROM kabinet WHERE user_id = ? LIMIT 1');
            mysqli_stmt_bind_param($stmt2, 's', $newUserId);
            mysqli_stmt_execute($stmt2);
            $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt2));
            mysqli_stmt_close($stmt2);

            auditLog('google_auto_register', "Google orqali avtomatik ro'yxatdan o'tdi: $email", $newUserId);
        }

        if (!$row) {
            return ['success' => false, 'error' => "Hisob yaratib bo'lmadi. Qaytadan urinib ko'ring."];
        }
        if (!empty($row['ban']) && $row['ban'] !== 'unban') {
            return ['success' => false, 'error' => 'Hisobingiz bloklangan.'];
        }

        session_regenerate_id(true);
        $_SESSION['user_data'] = $row;
        $_SESSION['user_id'] = (string)$row['user_id'];
        $_SESSION['is_admin'] = false;
        return ['success' => true, 'user_id' => (string)$row['user_id'], 'user' => $row];
    }

    /**
     * Google orqali kelgan (Telegram'siz) foydalanuvchi uchun, mavjud Telegram
     * ID'lar bilan hech qachon TO'QNASHMAYDIGAN user_id yaratadi ("g" bilan
     * boshlanadi — Telegram chat ID'lari faqat raqamlardan iborat bo'ladi).
     */
    function googleGenerateUserId(string $sub): string {
        global $connect;
        $base = 'g' . substr(hash('sha256', $sub), 0, 12);
        $candidate = $base;
        $suffix = 0;
        while (true) {
            $stmt = mysqli_prepare($connect, 'SELECT id FROM kabinet WHERE user_id = ? LIMIT 1');
            mysqli_stmt_bind_param($stmt, 's', $candidate);
            mysqli_stmt_execute($stmt);
            $exists = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            mysqli_stmt_close($stmt);
            if (!$exists) {
                return $candidate;
            }
            $suffix++;
            $candidate = $base . $suffix;
        }
    }

    /**
     * Email orqali ro'yxatdan o'tgan (Telegram/Google bo'lmagan) foydalanuvchi
     * uchun, mavjud ID'lar bilan hech qachon TO'QNASHMAYDIGAN user_id yaratadi
     * ("e" bilan boshlanadi).
     */
    function emailGenerateUserId(string $email): string {
        global $connect;
        $base = 'e' . substr(hash('sha256', mb_strtolower($email)), 0, 12);
        $candidate = $base;
        $suffix = 0;
        while (true) {
            $stmt = mysqli_prepare($connect, 'SELECT id FROM kabinet WHERE user_id = ? LIMIT 1');
            mysqli_stmt_bind_param($stmt, 's', $candidate);
            mysqli_stmt_execute($stmt);
            $exists = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
            mysqli_stmt_close($stmt);
            if (!$exists) {
                return $candidate;
            }
            $suffix++;
            $candidate = $base . $suffix;
        }
    }

    /**
     * Email + parol bilan YANGI hisob ochadi (saytdan to'g'ridan-to'g'ri,
     * Telegram/Google'siz ro'yxatdan o'tish). Email band bo'lsa xato qaytaradi —
     * bu holda foydalanuvchi kirish (login) formasidan foydalanishi kerak.
     */
    function registerEmailUser(string $email, string $password, string $ism): array {
        global $connect;
        authExtraMigrate();

        $email = mb_strtolower(trim($email));
        $ism = trim($ism);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'error' => 'Email manzili noto\'g\'ri.'];
        }
        if (mb_strlen($password) < 6) {
            return ['success' => false, 'error' => 'Parol kamida 6 belgidan iborat bo\'lishi kerak.'];
        }

        $stmt = mysqli_prepare($connect, 'SELECT id FROM kabinet WHERE email = ? OR login = ? LIMIT 1');
        mysqli_stmt_bind_param($stmt, 'ss', $email, $email);
        mysqli_stmt_execute($stmt);
        $exists = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);
        if ($exists) {
            return ['success' => false, 'error' => 'Bu email bilan hisob allaqachon mavjud. Kirish formasidan foydalaning.'];
        }

        $newUserId = emailGenerateUserId($email);
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $displayName = $ism !== '' ? $ism : $email;

        $ins = mysqli_prepare(
            $connect,
            "INSERT INTO kabinet (user_id, pul, pul2, odam, ban, ism, email, login, parol, auth_turi, foydalanuvchi_id) VALUES (?, '0', '0', '0', 'unban', ?, ?, ?, ?, 'email', ?)"
        );
        $displayId = generateDisplayId();
        mysqli_stmt_bind_param($ins, 'ssssss', $newUserId, $displayName, $email, $email, $hash, $displayId);
        mysqli_stmt_execute($ins);
        mysqli_stmt_close($ins);

        $regStr = date('Y-m-d') . ' | ' . date('H:i');
        $insU = mysqli_prepare($connect, 'INSERT INTO user_id (user_id, reg) VALUES (?, ?)');
        mysqli_stmt_bind_param($insU, 'ss', $newUserId, $regStr);
        mysqli_stmt_execute($insU);
        mysqli_stmt_close($insU);

        $stmt2 = mysqli_prepare($connect, 'SELECT * FROM kabinet WHERE user_id = ? LIMIT 1');
        mysqli_stmt_bind_param($stmt2, 's', $newUserId);
        mysqli_stmt_execute($stmt2);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt2));
        mysqli_stmt_close($stmt2);

        if (!$row) {
            return ['success' => false, 'error' => "Hisob yaratib bo'lmadi. Qaytadan urinib ko'ring."];
        }

        auditLog('email_register', "Email orqali ro'yxatdan o'tdi: $email", $newUserId);

        session_regenerate_id(true);
        $_SESSION['user_data'] = $row;
        $_SESSION['user_id'] = $newUserId;
        $_SESSION['is_admin'] = false;
        return ['success' => true, 'user_id' => $newUserId, 'user' => $row];
    }

    /** Sessiyadagi (yoki yangi yaratilgan) xom CSRF tokenni qaytaradi. */
    function authRawCsrfToken(): string {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    /** Foydalanuvchi qatoridan frontendga yuborish xavfli bo'lgan maydonlarni olib tashlaydi. */
    function sanitizeUserForClient(array $row): array {
        unset($row['parol'], $row['parol_ochiq'], $row['qurilma_hash'], $row['google_id']);
        return $row;
    }

    /**
     * `/auth/me.php`, `/auth/telegram.php`, `/auth/google.php`, `/auth/login.php`
     * javoblarining yagona shakli.
     */
    function buildAuthPayload(): array {
        $isAdmin = !empty($_SESSION['mw_admin']);
        $authenticated = $isAdmin || isLoggedIn();
        $role = null;
        $user = null;

        if ($isAdmin) {
            $role = 'admin';
        } elseif (isLoggedIn()) {
            $role = 'user';
            $fresh = getCurrentUser();
            $user = sanitizeUserForClient($fresh);
        }

        return [
            'authenticated' => $authenticated,
            'role' => $role,
            'user' => $user,
            'csrfToken' => authRawCsrfToken(),
        ];
    }
}
