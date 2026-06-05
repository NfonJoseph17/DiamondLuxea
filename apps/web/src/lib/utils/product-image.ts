import { normalizePublicApiBase } from '@/lib/api/normalize-api-base';

/** Resolve product.imageUrl for <img src> (API upload path or external URL). */
export function publicProductImageUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl?.trim()) return undefined;
  const s = pathOrUrl.trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = normalizePublicApiBase(
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined
  );
  if (s.startsWith('/')) return `${base}${s}`;
  return `${base}/${s}`;
}
