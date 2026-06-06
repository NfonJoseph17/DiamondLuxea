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
      {children}
      {/* Compact, non-blocking status pill — bottom center, never covers the header/menu. */}
      {(!online || pendingOutbox > 0) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
          <div
            role="status"
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-white shadow-lg ${
              !online ? 'bg-amber-600' : 'bg-primary'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full bg-white ${online ? 'animate-pulse' : ''}`}
            />
            {!online
              ? 'Offline — changes save here and sync later'
              : `Syncing ${pendingOutbox} change${pendingOutbox !== 1 ? 's' : ''}…`}
          </div>
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}
