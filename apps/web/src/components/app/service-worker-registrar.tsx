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
    // When a new service worker takes control (after a deploy), reload once so
    // the app runs the fresh code/chunks instead of stale cached ones.
    // Skip the very first install (no prior controller) to avoid a needless reload.
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Actively check for an updated worker on each load.
          reg.update().catch(() => {});
          return navigator.serviceWorker.ready;
        })
        .then(() => {
          // Ask the active worker to download all assets for offline use
          // (covers first install and refreshing after a new deploy).
          navigator.serviceWorker.controller?.postMessage({ type: 'PRECACHE' });
        })
        .catch(() => {
          /* registration is best-effort; app still works without it */
        });
    };
    window.addEventListener('load', onLoad);
    return () => {
      window.removeEventListener('load', onLoad);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
