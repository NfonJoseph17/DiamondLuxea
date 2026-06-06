'use client';

import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, CheckCircle2 } from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks/use-install-prompt';
import { InstallOptions } from '@/components/app/install-options';

interface InstallAppButtonProps {
  /** Called when the menu item is tapped (e.g. to close the mobile drawer). */
  onSelect?: () => void;
}

/** Sidebar menu entry that opens the app-install options in a dialog. */
export function InstallAppButton({ onSelect }: InstallAppButtonProps) {
  const [open, setOpen] = useState(false);
  const { canInstall, installed, help, install } = useInstallPrompt();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onSelect?.();
          setOpen(true);
        }}
        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
      >
        <Download className="h-5 w-5 shrink-0 text-white/70 transition-colors group-hover:text-white" />
        Download app
      </button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white">
              <Download className="h-5 w-5" />
            </span>
            Download the app
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Install Diamond Luxea on your device for a faster, full-screen experience that works offline.
          </p>
        </DialogHeader>

        {installed ? (
          <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-4 text-primary">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Diamond Luxea is already installed on this device. Launch it from your home screen or apps.
            </p>
          </div>
        ) : (
          <InstallOptions help={help} canInstall={canInstall} onInstall={install} />
        )}
      </Dialog>
    </>
  );
}
