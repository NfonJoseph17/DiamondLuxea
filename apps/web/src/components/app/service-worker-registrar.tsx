'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker so the app is installable
 * (Chrome/Edge require an active SW with a fetch handler to fire
 * `beforeinstallprompt`). Production only, to avoid dev caching.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration is best-effort; app still works without it */
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
