// Vercel server-side proxy for the PHP backend.
// The browser only calls this same-origin function, so Telegram auth cookies
// can be forwarded without a browser CORS round-trip.
export const config = { api: { bodyParser: false }, maxDuration: 30 };

// Vercel -> Settings -> Environment Variables: BACKEND_ORIGIN (api/bot.js ham xuddi shuni ishlatadi).
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || 'https://6a4cc7f182c08.xvest2.ru').replace(/\/+$/, '');

async function readRawBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    return Buffer.from(JSON.stringify(req.body));
  }
  if (!req || typeof req[Symbol.asyncIterator] !== 'function') return Buffer.alloc(0);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function preventCaching(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie');
}

function sendJson(res, status, payload) {
  preventCaching(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(payload));
}

function routeFromRequest(req, requestUrl) {
  const queryValue = req.query?.__path ?? requestUrl.searchParams.get('__path');
  return Array.isArray(queryValue) ? queryValue.join('/') : queryValue;
}

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const routeValue = routeFromRequest(req, requestUrl);

    if (!routeValue) {
      return sendJson(res, 400, {
        ok: false,
        error: 'API yo‘li ko‘rsatilmagan.',
        error_code: 'API_PATH_REQUIRED',
      });
    }

    // The PHP backend only exposes ONE public entry point for this contract:
    //   /api/index.php?__path=<route>
    // api/index.php itself decides whether <route> maps to a real file
    // (e.g. auth/login.php) or to a "virtual" route handled inside
    // legacy.php (e.g. pulishlash/list, balance, chat/send, admin/*...).
    // Building a direct backend URL like /api/pulishlash/list.php here
    // bypasses that router entirely and 404s for every virtual route,
    // since no such file exists on the server.
    const route = String(routeValue).replace(/^\/+/, '').replace(/\.php(?=($|\/))/, '');
    requestUrl.searchParams.delete('__path');
    const backendParams = new URLSearchParams(requestUrl.search);
    backendParams.set('__path', route);
    const targetUrl = `${BACKEND_ORIGIN}/api/index.php?${backendParams.toString()}`;
    const method = req.method || 'GET';
    const headers = { Accept: 'application/json', 'Cache-Control': 'no-store' };
    const incomingHeaders = req.headers || {};
    if (incomingHeaders['content-type']) headers['Content-Type'] = incomingHeaders['content-type'];
    if (incomingHeaders.cookie) headers.Cookie = incomingHeaders.cookie;
    // Backend rate-limit haqiqiy mijoz IP'si bo'yicha ishlashi uchun (PROXY_SHARED_SECRET ikki tomonda bir xil bo'lsin).
    const sharedSecret = process.env.PROXY_SHARED_SECRET;
    if (sharedSecret) {
      const fwd = String(incomingHeaders['x-forwarded-for'] || incomingHeaders['x-real-ip'] || '').split(',')[0].trim();
      if (fwd) headers['X-Makefy-Client-IP'] = fwd;
      headers['X-Makefy-Proxy-Secret'] = sharedSecret;
      if (incomingHeaders['user-agent']) headers['X-Makefy-Client-UA'] = String(incomingHeaders['user-agent']).slice(0, 255);
    }
    let body;
    if (method !== 'GET' && method !== 'HEAD') {
      const rawBody = await readRawBody(req);
      if (rawBody.length) body = rawBody;
    }

    const backendRes = await fetch(targetUrl, { method, headers, body, redirect: 'manual' });
    const setCookies = typeof backendRes.headers.getSetCookie === 'function'
      ? backendRes.headers.getSetCookie()
      : (backendRes.headers.get('set-cookie') ? [backendRes.headers.get('set-cookie')] : []);
    if (setCookies.length) res.setHeader('Set-Cookie', setCookies);
    const buffer = Buffer.from(await backendRes.arrayBuffer());
    if (!buffer.length) {
      // Some successful PHP auth endpoints update the session and intentionally
      // finish without a response body. Treat that as success so the frontend
      // can call /auth/me.php and read the newly created session.
      if (backendRes.status >= 200 && backendRes.status < 300) {
        return sendJson(res, 200, { ok: true, data: null });
      }
      return sendJson(res, backendRes.status >= 400 ? backendRes.status : 502, {
        ok: false,
        error: 'Backend bo‘sh javob qaytardi.',
        error_code: 'BACKEND_EMPTY_RESPONSE',
        status: backendRes.status,
      });
    }
    preventCaching(res);
    const disposition = backendRes.headers.get('content-disposition');
    if (disposition) res.setHeader('Content-Disposition', disposition);
    res.statusCode = backendRes.status;
    res.setHeader('Content-Type', backendRes.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.end(buffer);
  } catch (error) {
    console.error('API proxy error:', error);
    return sendJson(res, 502, {
      ok: false,
      error: 'Server vaqtincha javob bermayapti. Birozdan so‘ng qayta urinib ko‘ring.',
      error_code: 'PROXY_INTERNAL',
    });
  }
}
