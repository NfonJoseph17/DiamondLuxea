'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, CheckCircle2 } from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks/use-install-prompt';
import { InstallOptions } from '@/components/app/install-options';

export function InstallAppCard() {
  const { canInstall, installed, help, install } = useInstallPrompt();

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
      <CardContent>
        <InstallOptions help={help} canInstall={canInstall} onInstall={install} />
      </CardContent>
    </Card>
  );
}
