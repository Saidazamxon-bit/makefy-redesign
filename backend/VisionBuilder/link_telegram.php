<?php
/**
 * Telegram akkauntini saytdagi (Google/Email) hisobga ulash.
 * VisionBuilder/index.php ichidan "/start link_123456" kelganda chaqiriladi.
 * Mustaqil funksiya: faqat mavjud $connect (mysqli) dan foydalanadi.
 */
if (!function_exists('vbConfirmTelegramLink')) {
    function vbConfirmTelegramLink($connect, string $code, string $tgId, string $tgUsername): array {
        if ($code === '' || $tgId === '') {
            return ['success' => false, 'error' => "Ma'lumotlar to'liq emas."];
        }

        $stmt = mysqli_prepare($connect, 'SELECT user_id, created_at FROM telegram_link_codes WHERE code = ? LIMIT 1');
        if (!$stmt) {
            return ['success' => false, 'error' => "Tizim hali tayyor emas (migratsiya bajarilmagan). Administratorga xabar bering."];
        }
        mysqli_stmt_bind_param($stmt, 's', $code);
        mysqli_stmt_execute($stmt);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if (!$row) {
            return ['success' => false, 'error' => "Kod topilmadi yoki eskirgan. Saytdan yangi kod oling."];
        }
        if (strtotime((string)$row['created_at']) < time() - 600) {
            return ['success' => false, 'error' => "Kod muddati o'tgan (10 daqiqa). Saytdan yangi kod oling."];
        }

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
        $ok = mysqli_stmt_execute($upd);
        mysqli_stmt_close($upd);
        if (!$ok) {
            return ['success' => false, 'error' => "Ulashda xatolik yuz berdi. Keyinroq urinib ko'ring."];
        }

        $del = mysqli_prepare($connect, 'DELETE FROM telegram_link_codes WHERE code = ?');
        mysqli_stmt_bind_param($del, 's', $code);
        mysqli_stmt_execute($del);
        mysqli_stmt_close($del);

        return ['success' => true];
    }
}

// ============================================================================
//  Botdagi "Google hisob" tugmalari uchun (ulash / uzish) — mustaqil funksiyalar
// ============================================================================
if (!function_exists('vbLinkTablesTayyor')) {
    function vbLinkTablesTayyor($connect): void {
        @mysqli_query($connect, "CREATE TABLE IF NOT EXISTS google_link_codes (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(12) NOT NULL, telegram_id VARCHAR(32) NOT NULL, tg_username VARCHAR(100) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY idx_glc_code (code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS linked_telegram_id VARCHAR(32) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS linked_tg_username VARCHAR(100) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS email VARCHAR(190) NULL");
        @mysqli_query($connect, "ALTER TABLE kabinet ADD COLUMN IF NOT EXISTS ism VARCHAR(150) NULL");
    }
}

if (!function_exists('vbFrontendUrl')) {
    function vbFrontendUrl(): string {
        $u = defined('FRONTEND_URL') ? (string)FRONTEND_URL : '';
        if ($u === '' && function_exists('env')) { $u = (string)env('FRONTEND_URL', ''); }
        return rtrim(trim($u), '/');
    }
}

if (!function_exists('vbGoogleHolat')) {
    /** Shu Telegram ID ulangan Google/Email hisobni qaytaradi (yo'q bo'lsa null). */
    function vbGoogleHolat($connect, string $tgId): ?array {
        $stmt = mysqli_prepare($connect, 'SELECT user_id, email, ism FROM kabinet WHERE linked_telegram_id = ? AND user_id != ? LIMIT 1');
        if (!$stmt) { return null; }
        mysqli_stmt_bind_param($stmt, 'ss', $tgId, $tgId);
        mysqli_stmt_execute($stmt);
        $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);
        return $row ?: null;
    }
}

if (!function_exists('vbGoogleKodYarat')) {
    function vbGoogleKodYarat($connect, string $tgId, string $tgUsername): string {
        $del = mysqli_prepare($connect, 'DELETE FROM google_link_codes WHERE telegram_id = ?');
        mysqli_stmt_bind_param($del, 's', $tgId);
        mysqli_stmt_execute($del);
        mysqli_stmt_close($del);

        $code = (string)random_int(100000, 999999);
        for ($i = 0; $i < 20; $i++) {
            $chk = mysqli_prepare($connect, 'SELECT id FROM google_link_codes WHERE code = ? LIMIT 1');
            mysqli_stmt_bind_param($chk, 's', $code);
            mysqli_stmt_execute($chk);
            $bor = mysqli_fetch_assoc(mysqli_stmt_get_result($chk));
            mysqli_stmt_close($chk);
            if (!$bor) { break; }
            $code = (string)random_int(100000, 999999);
        }
        $ins = mysqli_prepare($connect, 'INSERT INTO google_link_codes (code, telegram_id, tg_username) VALUES (?, ?, ?)');
        mysqli_stmt_bind_param($ins, 'sss', $code, $tgId, $tgUsername);
        mysqli_stmt_execute($ins);
        mysqli_stmt_close($ins);
        return $code;
    }
}

if (!function_exists('vbGoogleUzish')) {
    function vbGoogleUzish($connect, string $tgId): bool {
        $stmt = mysqli_prepare($connect, 'UPDATE kabinet SET linked_telegram_id = NULL, linked_tg_username = NULL WHERE linked_telegram_id = ?');
        if (!$stmt) { return false; }
        mysqli_stmt_bind_param($stmt, 's', $tgId);
        mysqli_stmt_execute($stmt);
        $n = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
        return $n > 0;
    }
}
