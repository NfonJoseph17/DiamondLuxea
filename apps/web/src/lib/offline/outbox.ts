import { offlineDb, type OutboxRow } from './db';

export async function enqueueOutbox(row: Omit<OutboxRow, 'attempts'> & { attempts?: number }): Promise<void> {
  await offlineDb.outbox.put({
    ...row,
    attempts: row.attempts ?? 0,
  });
}

export async function listOutboxPending(): Promise<OutboxRow[]> {
  return offlineDb.outbox.orderBy('createdAt').toArray();
}

export async function removeOutbox(id: string): Promise<void> {
  await offlineDb.outbox.delete(id);
}

export async function updateOutboxAttempt(id: string, attempts: number, lastError?: string): Promise<void> {
  const row = await offlineDb.outbox.get(id);
  if (row) {
    await offlineDb.outbox.put({ ...row, attempts, lastError });
  }
}

export async function outboxPendingCount(): Promise<number> {
  return offlineDb.outbox.count();
}
