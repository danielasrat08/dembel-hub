/**
 * Forwards /api/* from the web app to the API service at request time.
 * API_URL is read when the server runs (not at build), so hosting changes need no rebuild.
 *  - Render: https://dembel-api.onrender.com (set in render.yaml; also the default on Render)
 *  - Docker Compose: Caddy sends /api straight to the API, so this is only a fallback (http://api:4000)
 *  - Local dev: http://localhost:4000
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const API_URL = (
  process.env.API_URL ||
  (process.env.RENDER ? 'https://dembel-api.onrender.com' : 'http://localhost:4000')
).replace(/\/$/, '');

const PASS_REQUEST = ['cookie', 'content-type', 'user-agent', 'accept', 'accept-language'];

async function forward(req: NextRequest) {
  const target = `${API_URL}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const h of PASS_REQUEST) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
  if (ip) headers.set('x-forwarded-for', ip);
  headers.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000), // free hosting can take ~1 min to wake
    });
  } catch {
    return Response.json({ message: 'The server is starting up or not reachable. Try again in a minute.' }, { status: 502 });
  }

  const out = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) out.set('content-type', ct);
  for (const c of upstream.headers.getSetCookie()) out.append('set-cookie', c);
  out.set('cache-control', 'no-store');
  return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: out });
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
