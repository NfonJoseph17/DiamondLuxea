import { toast } from '@/components/ui/toaster';
import { isApiError } from '@/lib/api/client';
import { isOfflineQueuedError } from '@/lib/offline/errors';

/**
 * Single place to turn a failed mutation into a user-facing toast.
 *
 * Offline-queued mutations are NOT errors — the change was saved locally and
 * will sync automatically, so we show a friendly success message instead of
 * a scary "Failed" toast. This lets every screen "work offline" consistently.
 */
export function reportMutationError(err: unknown, fallback = 'Something went wrong') {
  if (isOfflineQueuedError(err)) {
    toast('Saved offline — will sync when you’re back online', 'success');
    return;
  }
  if (isApiError(err)) {
    toast(err.message, 'error');
    return;
  }
  if (err instanceof Error && err.message) {
    toast(err.message, 'error');
    return;
  }
  toast(fallback, 'error');
}
