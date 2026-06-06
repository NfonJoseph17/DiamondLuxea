'use client';

import { Smartphone, Apple, Monitor, Download, Share } from 'lucide-react';
import {
  INSTALL_HELP,
  type InstallPlatform,
} from '@/lib/hooks/use-install-prompt';

interface InstallOptionsProps {
  help: InstallPlatform | null;
  canInstall: boolean;
  onInstall: (platform: InstallPlatform) => void;
}

const BUTTONS: { platform: InstallPlatform; label: string; sub: string; icon: typeof Smartphone }[] = [
  { platform: 'android', label: 'Android', sub: 'Phone & tablet', icon: Smartphone },
  { platform: 'ios', label: 'iPhone / iPad', sub: 'iOS Safari', icon: Apple },
  { platform: 'desktop', label: 'Desktop', sub: 'Windows & Mac', icon: Monitor },
];

/** Shared Android / iOS / Desktop install buttons + contextual help steps. */
export function InstallOptions({ help, canInstall, onInstall }: InstallOptionsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {BUTTONS.map(({ platform, label, sub, icon: Icon }) => {
          const active = help === platform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => onInstall(platform)}
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
            {help === 'ios' ? (
              <Share className="h-4 w-4 text-primary" />
            ) : (
              <Download className="h-4 w-4 text-primary" />
            )}
            {INSTALL_HELP[help].title}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {INSTALL_HELP[help].steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {canInstall && !help && (
        <p className="text-xs text-muted-foreground">
          Tip: tap Android or Desktop above to install instantly on this device.
        </p>
      )}
    </div>
  );
}
