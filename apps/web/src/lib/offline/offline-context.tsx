'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { outboxPendingCount } from './outbox';
import { processOutbox, subscribeSync } from './sync';
import { browserReportsOnline } from './network';

interface OfflineContextValue {
  online: boolean;
  pendingOutbox: number;
  refreshPending: () => Promise<void>;
  runSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(true);
  const [pendingOutbox, setPendingOutbox] = useState(0);

  const refreshPending = useCallback(async () => {
    setPendingOutbox(await outboxPendingCount());
  }, []);

  const runSync = useCallback(async () => {
    const { synced } = await processOutbox();
    if (synced > 0) {
      await queryClient.invalidateQueries();
    }
    await refreshPending();
  }, [queryClient, refreshPending]);

  useEffect(() => {
    const on = () => setOnline(browserReportsOnline());
    if (typeof window !== 'undefined') {
      setOnline(browserReportsOnline());
      window.addEventListener('online', on);
      window.addEventListener('offline', on);
    }
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    return subscribeSync((e) => {
      if (e.type === 'done' && (e.synced ?? 0) > 0) {
        void queryClient.invalidateQueries();
      }
      void refreshPending();
    });
  }, [queryClient, refreshPending]);

  useEffect(() => {
    if (!online) return;
    const t = window.setTimeout(() => void runSync(), 400);
    return () => window.clearTimeout(t);
  }, [online, runSync]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && browserReportsOnline()) {
        void runSync();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [runSync]);

  // Service worker registration lives in <ServiceWorkerRegistrar /> (root layout).

  const value = useMemo(
    () => ({ online, pendingOutbox, refreshPending, runSync }),
    [online, pendingOutbox, refreshPending, runSync]
  );

  return (
    <OfflineContext.Provider value={value}>
      {!online && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[100] bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white shadow-md"
        >
          You&apos;re offline — showing saved data. Changes you make are stored on this device and will sync
          automatically when you&apos;re back online.
        </div>
      )}
      {online && pendingOutbox > 0 && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[100] bg-blue-700 px-4 py-2 text-center text-sm font-medium text-white shadow-md"
        >
          {pendingOutbox} pending change{pendingOutbox !== 1 ? 's' : ''} to upload — syncing automatically…
        </div>
      )}
      <div className={!online || pendingOutbox > 0 ? 'pt-10' : ''}>{children}</div>
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}
