// Backend JSON API bilan ishlash uchun yagona nuqta.
// Sessiya PHP cookie orqali ishlaydi (credentials: 'include').
//
// Productionda PHP backend boshqa domenda joylashgan. Backend CORS va
// SameSite=None cookie'larni qo'llab-quvvatlashi kerak; so'rovlar Vercel
// serverless proxy'sidan o'tmaydi.
const BACKEND_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || 'https://6a4cc7f182c08.xvest2.ru'
).replace(/\/+$/, '');
// API brauzerda Vercel same-origin proxy orqali ishlaydi; backend manzili faqat media URL'lar uchun kerak.
const API_BASE = '';
const API_PREFIX = '/api';

// Backend "/uploads/..." kabi nisbiy (relative) yo'l qaytaradigan joylar bor
// (masalan chatdagi rasmlar) — bular hostingning o'zida joylashgan, Vercel'da
// emas, shuning uchun to'liq manzilga aylantirib ko'rsatish kerak.
export function mediaUrl(path) {
  if (!path) return path;
  return /^https?:\/\//i.test(path)
    ? path
    : `${BACKEND_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, retryOnCsrf = true } = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = { 'Cache-Control': 'no-store' };

  let finalBody;
  if (body === undefined) {
    finalBody = undefined;
  } else if (isFormData) {
    if (method !== 'GET' && csrfToken && !body.has('_csrf_token')) body.append('_csrf_token', csrfToken);
    finalBody = body; // brauzer Content-Type'ni o'zi qo'yadi (multipart) — bu ham CORS-safe
  } else {
    const bodyWithCsrf =
      method !== 'GET' && csrfToken ? { ...body, _csrf_token: csrfToken } : body;
    headers['Content-Type'] = 'application/json;charset=UTF-8'; // same-origin proxy: backendga haqiqiy JSON content-type yuboramiz
    finalBody = JSON.stringify(bodyWithCsrf);
  }

  const publicPath = normalizedPath.replace(/\.php(?=($|\?))/, '');
  const [pathPart, queryPart = ''] = publicPath.split('?');
  const proxyParams = new URLSearchParams();
  proxyParams.set('__path', pathPart.replace(/^\/+/, ''));
  if (queryPart) {
    const originalParams = new URLSearchParams(queryPart);
    originalParams.forEach((value, key) => proxyParams.append(key, value));
  }
  const url = `${API_BASE}${API_PREFIX}/index?${proxyParams.toString()}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: finalBody,
      cache: 'no-store',
    });
  } catch (networkErr) {
    // fetch() o'zi tashlagan xato (masalan CORS bloklagan yoki server umuman
    // javob bermagan) — bu holatda res hech qachon kelmaydi. Xato matnini
    // to'g'ridan-to'g'ri ko'rsatamiz, shunda muammo aniq ko'rinadi.
    console.error('[api] FETCH_FAILED', url, networkErr);
    throw new ApiError('Ulanish xatosi. Internetni tekshirib, qayta urinib ko‘ring.', 'FETCH_FAILED', 0);
  }

  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    // Server javob berdi, lekin JSON emas (masalan PHP xato sahifasi, 404,
    // yoki redirect natijasida boshqa HTML qaytdi). Diagnostika uchun
    // status kodi va javobning boshlanishini xabarga qo'shamiz.
    const preview = raw.slice(0, 160).replace(/\s+/g, ' ').trim();
    console.error('[api] BAD_RESPONSE', res.status, url, preview || '(bo\'sh javob)');
    throw new ApiError(
      `Server kutilmagan javob qaytardi (HTTP ${res.status}). Birozdan so‘ng qayta urinib ko‘ring.`,
      'BAD_RESPONSE',
      res.status
    );
  }

  if (!json.ok) {
    if (retryOnCsrf && method !== 'GET' && json.error_code === 'CSRF_INVALID') {
      // Sessiya cookie'si saqlanib qolgan, ammo token eskirgan bo'lishi mumkin.
      // Yangi tokenni olib, aynan shu so'rovni faqat bir marta qaytaramiz.
      const freshSession = await request('/auth/me.php', { method: 'GET', retryOnCsrf: false });
      if (freshSession?.csrfToken) {
        csrfToken = freshSession.csrfToken;
        return request(path, { method, body, retryOnCsrf: false });
      }
    }
    const apiErr = new ApiError(json.error || 'Xatolik yuz berdi.', json.error_code || 'ERROR', res.status);
    if (json.upgrade) apiErr.upgrade = true; // tarif limiti: UI "Tarifni oshirish" tugmasini ko'rsatadi
    throw apiErr;
  }
  return json.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body ?? {} }),
};
