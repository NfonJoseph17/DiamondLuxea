/** Mutation was stored locally and will sync when online */
export class OfflineQueuedError extends Error {
  readonly queued = true;
  readonly clientMutationId?: string;

  constructor(message = 'Queued for sync when you are back online', clientMutationId?: string) {
    super(message);
    this.name = 'OfflineQueuedError';
    this.clientMutationId = clientMutationId;
  }
}

export function isOfflineQueuedError(err: unknown): err is OfflineQueuedError {
  return err instanceof OfflineQueuedError;
}
