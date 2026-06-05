import Dexie, { type Table } from 'dexie';

export interface OutboxRow {
  id: string;
  method: string;
  path: string;
  bodyJson: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

class OfflineDexie extends Dexie {
  outbox!: Table<OutboxRow, string>;

  constructor() {
    super('bar-depot-offline');
    this.version(1).stores({
      outbox: 'id, createdAt',
    });
  }
}

export const offlineDb = new OfflineDexie();
