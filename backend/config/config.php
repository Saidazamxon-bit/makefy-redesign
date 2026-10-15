<?php
declare(strict_types=1);
/**
 * MakerWeb - Asosiy konfiguratsiya fayli
 *
 * .env faylidan muhit o'zgaruvchilarini o'qib, PHP konstantalarini belgilaydi.
 * Bu fayl hech qachon git'ga qo'shilmasligi kerak (config.php .gitignore'da).
 *
 * @author  MakerWeb Security Team
 * @version 2.0.0
 */

// ============================================================
// .env faylini o'qish va tahlil qilish
// ============================================================

/**
 * `.env` fayli odatda loyiha ildizida bo'ladi. Shared hostinglarda esa uni
 * public_html'dan bir pog'ona yuqorida yoki config/ ichida saqlashadi.
 * MAKER_ENV_PATH berilsa, shu aniq yo'l birinchi navbatda ishlatiladi.
 */
$projectRoot = dirname(__DIR__);
$configuredEnvPath = trim((string)(getenv('MAKER_ENV_PATH') ?: ''));
$envCandidates = array_filter([
    $configuredEnvPath !== '' ? $configuredEnvPath : null,
    $projectRoot . DIRECTORY_SEPARATOR . '.env',
    dirname($projectRoot) . DIRECTORY_SEPARATOR . '.env',
    __DIR__ . DIRECTORY_SEPARATOR . '.env',
]);
$envPath = '';
foreach ($envCandidates as $candidate) {
    if (is_file($candidate) && is_readable($candidate)) {
        $envPath = $candidate;
        break;
    }
}

/**
 * .env faylini satr-satr o'qib, muhit o'zgaruvchilarini belgilaydi
 *
 * @param string $path .env faylining to'liq yo'li
 * @return array Barcha kalit-qiymat juftliklari
 */
function parseEnvFile(string $path): array
{
    $vars = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    if ($lines === false) {
        return $vars;
    }

    foreach ($lines as $line) {
        // Izohlarni o'tkazib yuborish
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }

        // Kalit=qiymat formatini tahlil qilish
        if (strpos($line, '=') === false) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);

        // Qo'shtirnoqlarni olib tashlash
        $firstChar = substr($value, 0, 1);
        $lastChar  = substr($value, -1);
        if (
            ($firstChar === '"' && $lastChar === '"') ||
            ($firstChar === "'" && $lastChar === "'")
        ) {
            $value = substr($value, 1, -1);
        }

        $vars[$key] = $value;

        // Muhit o'zgaruvchisiga yozish (agar mavjud bo'lmasa)
        if (!isset($_ENV[$key])) {
            $_ENV[$key] = $value;
        }
        if (getenv($key) === false) {
            putenv("$key=$value");
        }
    }

    return $vars;
}

/** Muhit o'zgaruvchilarini yuklash */
$envVars = $envPath !== '' ? parseEnvFile($envPath) : [];

/**
 * Konfiguratsiya bo'lmasa, PHP warning/HTML o'rniga frontend kutadigan JSON
 * javob qaytaradi. Qiymatlarning o'zi hech qachon javobga chiqarilmaydi.
 */
function configFailure(array $missingKeys): void
{
    $message = 'Server sozlamalari topilmadi. .env faylini loyiha ildiziga joylashtiring.';
    $detail = 'Yetishmayotgan kalitlar: ' . implode(', ', $missingKeys);
    error_log('[KRITIK] ' . $detail);

    $requestUri = (string)($_SERVER['REQUEST_URI'] ?? '');
    $accept = strtolower((string)($_SERVER['HTTP_ACCEPT'] ?? ''));
    if (strpos($requestUri, '/api/') !== false || strpos($requestUri, '/api?') !== false || strpos($accept, 'application/json') !== false) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => false,
            'error' => $message,
            'error_code' => 'CONFIG_MISSING',
            'missing' => $missingKeys,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(500);
    exit($message . ' ' . $detail);
}

// .env mavjud bo'lsa ham bo'sh yoki noto'g'ri nomlangan bo'lishi mumkin.
// Shuning uchun tekshiruv fayl mavjudligiga emas, qiymatning o'ziga qaraydi.
$requiredRuntimeKeys = ['DB_HOST', 'DB_USERNAME', 'DB_NAME', 'BOT_TOKEN'];
$missingRuntimeKeys = [];
foreach ($requiredRuntimeKeys as $runtimeKey) {
    $valueFromEnvFile = (string)($envVars[$runtimeKey] ?? '');
    $valueFromRuntime = getenv($runtimeKey);
    if (trim($valueFromEnvFile) === '' && ($valueFromRuntime === false || trim((string)$valueFromRuntime) === '')) {
        $missingRuntimeKeys[] = $runtimeKey;
    }
}
if ($missingRuntimeKeys !== []) {
    configFailure($missingRuntimeKeys);
}

/**
 * Muhit o'zgaruvchisini xavfsiz olish
 *
 * @param string $key   O'zgaruvchi nomi
 * @param mixed  $default Standart qiymat
 * @return string
 */
function env(string $key, $default = ''): string
{
    global $envVars;
    return $envVars[$key] ?? ($_ENV[$key] ?? (getenv($key) ?: (string)$default));
}

// ============================================================
// Loyiha ildiz papkasi (DOCUMENT_ROOT ga bog'liq bo'lmagan, ishonchli usul)
// ============================================================
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', dirname(__DIR__));
}

// ============================================================
// Ma'lumotlar bazasi konstantalari
// ============================================================
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_USERNAME', env('DB_USERNAME'));
define('DB_PASSWORD', env('DB_PASSWORD'));
define('DB_NAME', env('DB_NAME'));

// ============================================================
// Admin sozlamalari
// ============================================================
define('ADMIN_LOGIN', env('ADMIN_LOGIN', 'Admin'));
define('ADMIN_PASSWORD_HASH', env('ADMIN_PASSWORD'));
define('ADMIN_TELEGRAM_ID', env('ADMIN_TELEGRAM_ID'));

// Eski kod bilan moslik uchun (faqat o'qish)
if (!defined('ADMIN_PAROL')) {
    // DIQQAT: Endi parol hash sifatida saqlanadi, oddiy matn emas!
    define('ADMIN_PAROL', '__HASHED__');
}

// ============================================================
// Telegram bot sozlamalari
// ============================================================
define('BOT_TOKEN', env('BOT_TOKEN'));
define('WEBHOOK_SECRET_TOKEN', env('WEBHOOK_SECRET_TOKEN'));
define('API_KEY', BOT_TOKEN); // Eski kod bilan moslik uchun
define('WEB_APP_URL', env('WEB_APP_URL'));
define('KARTA_RAQAM', env('KARTA_RAQAM'));
define('KARTA_EGASI', env('KARTA_EGASI'));
define('WEBAPP_QOSHISH_NARXI', (float)env('WEBAPP_QOSHISH_NARXI', '5000')); // Botga WebApp tugmasi qo'shish narxi (so'm)

// ============================================================
// Google orqali kirish (Google Identity Services)
// ============================================================
// Google Cloud Console -> Credentials -> OAuth client ID (Web application)
// dan olingan Client ID. Frontend ham AYNAN shu Client ID bilan ishga
// tushirilishi kerak (VITE_GOOGLE_CLIENT_ID), aks holda token rad etiladi.
define('GOOGLE_CLIENT_ID', env('GOOGLE_CLIENT_ID', ''));

// JSON API'ga to'g'ridan-to'g'ri (Vercel proxy'siz) boshqa domendan kirish
// uchun ruxsat etilgan manzillar, vergul bilan ajratilgan
// (masalan: https://makefy.vercel.app,https://makefy.uz)
define('ALLOWED_ORIGINS', env('ALLOWED_ORIGINS', ''));

// Eski kodda global o'zgaruvchilar ishlatilgan
$web_app     = WEB_APP_URL;
$karta_raqam = KARTA_RAQAM;
$karta_egasi = KARTA_EGASI;

// ============================================================
// Ilova sozlamalari
// ============================================================
define('APP_ENV', env('APP_ENV', 'production'));
define('APP_DEBUG', env('APP_DEBUG', 'false') === 'true');
define('APP_URL', env('APP_URL', 'https://example.com'));
// Frontend (Vercel) manzili — saytga havolalar (Google ulash sahifasi va h.k.) uchun.
// APP_URL esa BACKEND manzili bo'lib qoladi (webhooklar shunga tayanadi).
define('FRONTEND_URL', rtrim(trim(env('FRONTEND_URL', '')), '/'));

// ============================================================
// Xavfsizlik sozlamalari
// ============================================================
define('SESSION_LIFETIME', (int)env('SESSION_LIFETIME', '3600'));
define('RATE_LIMIT_MAX_ATTEMPTS', (int)env('RATE_LIMIT_MAX_ATTEMPTS', '5'));
define('RATE_LIMIT_LOCKOUT_MINUTES', (int)env('RATE_LIMIT_LOCKOUT_MINUTES', '15'));

// ============================================================
// Xato hisobotini sozlash
// ============================================================
$logDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0750, true);
}

if (APP_DEBUG) {
    // Dasturchi rejimi — barcha xatolar ko'rsatiladi
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    // Ishlab chiqarish rejimi — xatolar faqat log faylga yoziladi
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
    ini_set('display_errors', '0');
}

// Xatolarni log faylga yo'naltirish
ini_set('log_errors', '1');
ini_set('error_log', $logDir . DIRECTORY_SEPARATOR . 'error.log');

// ============================================================
// Vaqt mintaqasi
// ============================================================
date_default_timezone_set('Asia/Tashkent');

// ============================================================
// Xavfsizlik: PHP versiya ma'lumotini yashirish
// ============================================================
if (function_exists('header_remove')) {
    @header_remove('X-Powered-By');
}
