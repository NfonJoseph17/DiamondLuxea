/**
 * NEXT_PUBLIC_API_URL must be an absolute origin for fetch().
 * If the scheme is omitted (e.g. "api-xxx.up.railway.app"), the browser treats the value as a path on the current site → 404.
 */
export function normalizePublicApiBase(raw: string | undefined): string {
  let s = String(raw ?? '').trim();
  if (!s) return 'http://localhost:3001';
  s = s.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  if (/\/api\/?$/i.test(s)) {
    s = s.replace(/\/api\/?$/i, '');
  }
  return s;
}
