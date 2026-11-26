import { getApiBaseUrl } from '@/config/api-base';

const memberEndpoints: Record<string, string[]> = {
  GET: ['auth/csrf', 'users/compatible', 'users/results_filters', 'users/excluded_search_preference', 'saved-result-filters'],
  POST: [
    'auth/login', 'auth/logout', 'auth/signup', 'auth/verify-email',
    'auth/impostor-login', 'auth/impostor-exit', 'saved-result-filters',
  ],
  PUT: ['users/results_filters', 'users/excluded_search_preference'],
};

const profileAccess = /^users\/[0-9a-f-]{36}\/profile_access$/i;
const savedPreset = /^saved-result-filters\/[0-9a-f-]{36}$/i;

async function proxyMemberRequest(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join('/');
  const { method } = request;
  const allowed = memberEndpoints[method]?.includes(endpoint)
    || (method === 'GET' && profileAccess.test(endpoint))
    || ((method === 'PATCH' || method === 'DELETE') && savedPreset.test(endpoint));
  if (!allowed) return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  const backend = new URL(`${getApiBaseUrl().replace(/\/$/, '')}/${endpoint}/`);
  backend.search = new URL(request.url).search;
  const headers = new Headers({ Accept: 'application/json' });
  for (const name of ['Content-Type', 'Cookie', 'Origin', 'Referer', 'X-CSRFToken', 'X-Results-Search-Grant']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(backend, {
      method,
      headers,
      body: method === 'GET' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store' });
    const contentType = upstream.headers.get('Content-Type');
    if (contentType) responseHeaders.set('Content-Type', contentType);
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append('Set-Cookie', cookie);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: 'Unable to reach the server. Please try again.' }, { status: 502 });
  }
}

export {
  proxyMemberRequest as GET,
  proxyMemberRequest as POST,
  proxyMemberRequest as PUT,
  proxyMemberRequest as PATCH,
  proxyMemberRequest as DELETE,
};
