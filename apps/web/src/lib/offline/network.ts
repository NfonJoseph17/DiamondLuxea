/** True when browser reports online; still try fetch for flaky connections. */
export function browserReportsOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && String(err.message).toLowerCase().includes('fetch')) return true;
  if (err instanceof Error && err.name === 'NetworkError') return true;
  return false;
}
