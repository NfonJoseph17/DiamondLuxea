import { normalizePublicApiBase } from '@/lib/api/normalize-api-base';
import { listOutboxPending, removeOutbox, updateOutboxAttempt } from './outbox';
import { browserReportsOnline } from './network';

const API_BASE = normalizePublicApiBase(process.env.NEXT_PUBLIC_API_URL);

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

let syncing = false;

export function isSyncing(): boolean {
  return syncing;
}

/** Replay one outbox row to the API (no offline queue). */
export async function replayOutboxRow(row: {
  id: string;
  method: string;
  path: string;
  bodyJson: string;
  attempts: number;
}): Promise<{ ok: boolean; status: number; body?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${row.path}`, {
    method: row.method,
    headers,
    body: row.method === 'GET' || row.method === 'DELETE' ? undefined : row.bodyJson || undefined,
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text || undefined };
}

export type SyncListener = (event: { type: 'start' | 'done' | 'error'; synced?: number; failed?: number }) => void;

const listeners = new Set<SyncListener>();

export function subscribeSync(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(e: Parameters<SyncListener>[0]) {
  listeners.forEach((l) => l(e));
}

/**
 * Process all queued mutations. Call when coming online or after login.
 */
export async function processOutbox(): Promise<{ synced: number; failed: number }> {
  if (!browserReportsOnline() || typeof window === 'undefined') {
    return { synced: 0, failed: 0 };
  }
  if (!getToken()) return { synced: 0, failed: 0 };
  if (syncing) return { synced: 0, failed: 0 };

  syncing = true;
  emit({ type: 'start' });
  let synced = 0;
  let failed = 0;

  try {
    const rows = await listOutboxPending();
    for (const row of rows) {
      try {
        const result = await replayOutboxRow(row);
        if (result.ok) {
          await removeOutbox(row.id);
          synced += 1;
        } else if (result.status === 401) {
          failed += 1;
          break;
        } else {
          await updateOutboxAttempt(row.id, row.attempts + 1, `HTTP ${result.status}`);
          failed += 1;
        }
      } catch (e) {
        await updateOutboxAttempt(
          row.id,
          row.attempts + 1,
          e instanceof Error ? e.message : String(e)
        );
        failed += 1;
      }
    }
  } finally {
    syncing = false;
    emit({ type: 'done', synced, failed });
  }

  return { synced, failed };
}
