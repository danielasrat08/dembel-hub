/** Small fetch wrapper for the Hub API (same origin; /api is proxied to the API service). */
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'offline');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(' ') : data?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data?.code);
  }
  return data as T;
}

export type Role = 'SR' | 'TM' | 'MD' | 'DS' | 'SS' | 'SM' | 'MM' | 'BM' | 'OA';
export interface Me {
  id: string;
  staffCode: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  preferredLang: 'EN' | 'AM';
  team: { id: string; code: string; name: string } | null;
}
