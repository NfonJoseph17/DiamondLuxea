'use client';

import { useCallback, useEffect, useState } from 'react';

/** The `beforeinstallprompt` event isn't in the standard DOM lib types. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'android' | 'ios' | 'desktop';

export const INSTALL_HELP: Record<InstallPlatform, { title: string; steps: string[] }> = {
  android: {
    title: 'Install on Android',
    steps: [
      'Open this site in Google Chrome.',
      'Tap the ⋮ menu (top-right).',
      'Tap “Install app” (or “Add to Home screen”).',
      'Confirm — Diamond Luxea appears on your home screen.',
    ],
  },
  ios: {
    title: 'Install on iPhone / iPad',
    steps: [
      'Open this site in Safari.',
      'Tap the Share button (the square with an up-arrow).',
      'Scroll down and tap “Add to Home Screen”.',
      'Tap “Add” — Diamond Luxea appears on your home screen.',
    ],
  },
  desktop: {
    title: 'Install on Desktop',
    steps: [
      'Open this site in Chrome or Microsoft Edge.',
      'Click the install icon (⊕ / monitor) at the right of the address bar.',
      'Or open the ⋮ menu and choose “Install Diamond Luxea”.',
      'The app opens in its own window and is added to your apps.',
    ],
  },
};

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState<InstallPlatform | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(
    async (platform: InstallPlatform) => {
      // iOS never exposes a programmatic prompt — always show steps.
      if (platform !== 'ios' && deferredPrompt) {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setInstalled(true);
        setDeferredPrompt(null);
        return;
      }
      setHelp((prev) => (prev === platform ? null : platform));
    },
    [deferredPrompt]
  );

  return {
    canInstall: !!deferredPrompt,
    installed,
    help,
    setHelp,
    install,
  };
}
