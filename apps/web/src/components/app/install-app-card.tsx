'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Apple, Monitor, Download, CheckCircle2, Share } from 'lucide-react';

/** The `beforeinstallprompt` event isn't in the standard DOM lib types. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'desktop';

const HELP: Record<Platform, { title: string; steps: string[] }> = {
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

export function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState<Platform | null>(null);

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

  async function handleInstall(platform: Platform) {
    // iOS never exposes a programmatic prompt — always show steps.
    if (platform !== 'ios' && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    setHelp((prev) => (prev === platform ? null : platform));
  }

  if (installed) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">App installed</p>
            <p className="text-sm text-muted-foreground">
              Diamond Luxea is installed on this device. Launch it from your home screen or apps.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const buttons: { platform: Platform; label: string; sub: string; icon: typeof Smartphone }[] = [
    { platform: 'android', label: 'Android', sub: 'Phone & tablet', icon: Smartphone },
    { platform: 'ios', label: 'iPhone / iPad', sub: 'iOS Safari', icon: Apple },
    { platform: 'desktop', label: 'Desktop', sub: 'Windows & Mac', icon: Monitor },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Download className="h-5 w-5" />
          </span>
          Download the app
        </CardTitle>
        <CardDescription>
          Install Diamond Luxea on your device for a faster, full-screen experience that works offline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {buttons.map(({ platform, label, sub, icon: Icon }) => {
            const active = help === platform;
            return (
              <button
                key={platform}
                type="button"
                onClick={() => handleInstall(platform)}
                className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99] ${
                  active ? 'border-primary/50 bg-primary/5' : 'border-border'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{sub}</span>
                </span>
              </button>
            );
          })}
        </div>

        {help && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              {help === 'ios' ? <Share className="h-4 w-4 text-primary" /> : <Download className="h-4 w-4 text-primary" />}
              {HELP[help].title}
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {HELP[help].steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {deferredPrompt && !help && (
          <p className="text-xs text-muted-foreground">
            Tip: tap Android or Desktop above to install instantly on this device.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
