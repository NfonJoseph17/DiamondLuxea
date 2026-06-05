'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';
import { OfflineProvider } from '@/lib/offline/offline-context';

const PERSIST_QUERY_ROOTS = new Set([
  'products',
  'balances',
  'sales',
  'purchases',
  'units',
  'suppliers',
  'users',
  'adjustments',
]);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 1000 * 60 * 60 * 24 * 7,
          },
        },
      })
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        <OfflineProvider>{children}</OfflineProvider>
      </QueryClientProvider>
    );
  }

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'bar-depot-rq-cache',
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) =>
            q.state.status === 'success' &&
            typeof q.queryKey[0] === 'string' &&
            PERSIST_QUERY_ROOTS.has(q.queryKey[0] as string),
        },
      }}
    >
      <OfflineProvider>{children}</OfflineProvider>
    </PersistQueryClientProvider>
  );
}
