// Bot Web App proksisi: /VisionBuilder/bots/<bot>/...  →  backend (PHP).
// Foydalanuvchi faqat frontend domenini ko'radi; backend manzili yashirin qoladi.
// vercel.json: /VisionBuilder/bots/:path*  →  /api/bot?p=:path*
export const config = { api: { bodyParser: false }, maxDuration: 30 };

const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || 'https://6a4cc7f182c08.xvest2.ru').replace(/\/+$/, '');
const SAFE_PATH = /^[A-Za-z0-9_][A-Za-z0-9_\-.]*(\/[A-Za-z0-9_\-.%~]*)*$/;
const SKIP_RESPONSE_HEADERS = new Set([
  'content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive',
  'content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'set-cookie',
  'strict-transport-security', 'server', 'x-powered-by', 'location',
]);

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    return Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function page(res, status, title, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<body style="font-family:system-ui;background:#0e1420;color:#e8ecf4;padding:32px"><h2>${title}</h2><p>${text}</p></body>`);
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let p = url.searchParams.get('p') ?? '';
    url.searchParams.delete('p');
    p = String(p).replace(/^\/+/, '');

    if (!p || p.includes('..') || !SAFE_PATH.test(p)) {
      return page(res, 400, 'Noto‘g‘ri manzil', 'Bot manzili xato.');
    }
    // "miniapp", "admin", "app", "panel" kabi papkalar — oxirida "/" bo'lishi kerak
    const last = p.split('/').pop();
    if (last !== '' && !last.includes('.')) p += '/';

    const qs = url.searchParams.toString();
    // Tokenli admin kirish: /api/bot/<bot>/admin?t=<token>  →  backend botadmin.php (token tekshiradi, cookie beradi, panelga yo'naltiradi)
    const adm = /^([A-Za-z0-9_]{3,64})\/admin\/?$/.exec(p);
    const target = adm
      ? `${BACKEND_ORIGIN}/VisionBuilder/botadmin.php?bot=${adm[1]}${qs ? '&' + qs : ''}`
      : `${BACKEND_ORIGIN}/VisionBuilder/bots/${p}${qs ? '?' + qs : ''}`;

    const method = req.method || 'GET';
    const inH = req.headers || {};
    const headers = { 'Accept-Encoding': 'identity' };
    for (const k of ['accept', 'accept-language', 'content-type', 'cookie', 'user-agent', 'x-telegram-init-data', 'x-requested-with']) {
      if (inH[k]) headers[k] = inH[k];
    }
    let body;
    if (method !== 'GET' && method !== 'HEAD') {
      const raw = await readBody(req);
      if (raw.length) body = raw;
    }

    const up = await fetch(target, { method, headers, body, redirect: 'manual' });

    const cookies = typeof up.headers.getSetCookie === 'function' ? up.headers.getSetCookie() : [];
    if (cookies.length) res.setHeader('Set-Cookie', cookies);

    const loc = up.headers.get('location');
    if (loc) {
      // backend domeniga qaytaradigan yo'naltirishlar frontend domeniga o'giriladi
      res.setHeader('Location', loc.startsWith(BACKEND_ORIGIN) ? loc.slice(BACKEND_ORIGIN.length) || '/' : loc);
    }
    up.headers.forEach((value, key) => { if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value); });
    res.setHeader('X-Makefy-Upstream-Status', String(up.status));
    const ct = up.headers.get('content-type') || '';
    if (/text\/html|json|php/i.test(ct) || !up.headers.get('cache-control')) res.setHeader('Cache-Control', 'no-store');

    const buf = Buffer.from(await up.arrayBuffer());
    res.statusCode = up.status;
    return res.end(method === 'HEAD' ? undefined : buf);
  } catch (error) {
    console.error('Bot proxy error:', error);
    return page(res, 502, 'Bot ilovasi vaqtincha ochilmadi',
      'Server bilan aloqa o‘rnatilmadi. Birozdan so‘ng qayta urinib ko‘ring.<br><small>' +
      String(error instanceof Error ? error.message : error).replace(/[<>&]/g, '') + '</small>');
  }
}
