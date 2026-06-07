import { browserReportsOnline, isNetworkError } from '@/lib/offline/network';
import { OfflineQueuedError } from '@/lib/offline/errors';
import { enqueueOutbox } from '@/lib/offline/outbox';
import {
  buildSyntheticAdjustment,
  buildSyntheticPurchase,
  buildSyntheticSale,
  type OfflineMeta,
  type OfflinePurchaseLineMeta,
  type OfflineSaleLineMeta,
} from '@/lib/offline/synthetic';
import { normalizePublicApiBase } from '@/lib/api/normalize-api-base';
import { uuid } from '@/lib/utils/uuid';

const API_BASE = normalizePublicApiBase(process.env.NEXT_PUBLIC_API_URL);

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Works even if multiple bundles duplicate the ApiError class (instanceof would fail). */
export function isApiError(e: unknown): e is ApiError {
  if (e instanceof ApiError) return true;
  if (typeof e !== 'object' || e === null) return false;
  const x = e as Record<string, unknown>;
  return (
    x.name === 'ApiError' &&
    typeof x.status === 'number' &&
    typeof x.message === 'string'
  );
}

/** NestJS ValidationPipe / HttpException body shape */
function messageFromHttpBody(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const m = (data as Record<string, unknown>).message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m) && m.every((x) => typeof x === 'string')) return m.join(', ');
  return undefined;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/** Strip client-only offline fields; returns JSON for server + optional meta for synthetic UI */
function prepareMutationBody(
  path: string,
  method: string,
  raw: unknown
): { bodyJson: string; offlineMeta?: OfflineMeta } {
  if (raw == null) return { bodyJson: 'null' };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { bodyJson: JSON.stringify(raw) };
  }

  const o = { ...(raw as Record<string, unknown>) };
  let offlineMeta: OfflineMeta | undefined;

  if (Array.isArray(o._offlineSaleLines)) {
    offlineMeta = { kind: 'sale', lines: o._offlineSaleLines as OfflineSaleLineMeta[] };
    delete o._offlineSaleLines;
  }
  if (Array.isArray(o._offlinePurchaseLines)) {
    offlineMeta = {
      kind: 'purchase',
      lines: o._offlinePurchaseLines as OfflinePurchaseLineMeta[],
      supplierName: (o._offlineSupplierName as string) ?? null,
    };
    delete o._offlinePurchaseLines;
    delete o._offlineSupplierName;
  }
  if (o._offlineAdjustment && typeof o._offlineAdjustment === 'object') {
    const a = o._offlineAdjustment as {
      productName: string;
      unitName?: string | null;
      unitConversionValue?: number | null;
    };
    offlineMeta = {
      kind: 'adjustment',
      productName: a.productName,
      unitName: a.unitName,
      unitConversionValue: a.unitConversionValue,
    };
    delete o._offlineAdjustment;
  }

  if (method === 'POST' && ['/sales', '/purchases', '/adjustments'].includes(path)) {
    if (typeof o.clientMutationId !== 'string' || !o.clientMutationId) {
      o.clientMutationId = uuid();
    }
  }

  return { bodyJson: JSON.stringify(o), offlineMeta };
}

async function handleOfflineOrQueueMutation<T>(params: {
  path: string;
  method: string;
  bodyJson: string;
  offlineMeta?: OfflineMeta;
}): Promise<T> {
  const { path, method, bodyJson, offlineMeta } = params;

  if (path.startsWith('/auth')) {
    throw new Error('You are offline. Connect to the internet to sign in or register.');
  }

  const parsed = JSON.parse(bodyJson) as Record<string, unknown>;
  const clientMutationId = (parsed.clientMutationId as string) || uuid();

  if (method === 'POST' && path === '/sales') {
    const lines =
      offlineMeta?.kind === 'sale'
        ? offlineMeta.lines
        : ((parsed.items as { productId: string; quantity: number; unitId: string }[]) || []).map(
            (it) => ({
              productId: it.productId,
              productName: 'Product',
              quantity: it.quantity,
              unitId: it.unitId,
              unitName: 'unit',
              unitSellingPrice: 0,
              unitPurchasePrice: 0,
            })
          );
    const bodyToStore = { ...parsed, clientMutationId };
    await enqueueOutbox({
      id: clientMutationId,
      method: 'POST',
      path,
      bodyJson: JSON.stringify(bodyToStore),
      createdAt: Date.now(),
      attempts: 0,
    });
    const totalPreview = lines.reduce((s, l) => s + l.quantity * l.unitSellingPrice, 0);
    const ps = parsed.paymentStatus as 'UNPAID' | 'PAID' | 'PARTIAL' | undefined;
    const pay =
      ps === 'UNPAID'
        ? { paymentStatus: 'UNPAID' as const, amountPaid: 0 }
        : ps === 'PARTIAL' && parsed.amountPaid != null
          ? {
              paymentStatus: 'PARTIAL' as const,
              amountPaid: Number(parsed.amountPaid),
            }
          : { paymentStatus: 'PAID' as const, amountPaid: totalPreview };
    return buildSyntheticSale(clientMutationId, parsed.notes as string | undefined, lines, pay) as T;
  }

  if (method === 'POST' && path === '/purchases') {
    const lines =
      offlineMeta?.kind === 'purchase'
        ? offlineMeta.lines
        : ((parsed.items as { productId: string; quantity: number; unitId: string }[]) || []).map(
            (it) => ({
              productId: it.productId,
              productName: 'Product',
              quantity: it.quantity,
              unitId: it.unitId,
              unitName: 'unit',
              unitPurchasePrice: 0,
              unitSellingPriceSnapshot: 0,
            })
          );
    const supplierName = offlineMeta?.kind === 'purchase' ? offlineMeta.supplierName : undefined;
    const bodyToStore = { ...parsed, clientMutationId };
    await enqueueOutbox({
      id: clientMutationId,
      method: 'POST',
      path,
      bodyJson: JSON.stringify(bodyToStore),
      createdAt: Date.now(),
      attempts: 0,
    });
    return buildSyntheticPurchase(
      clientMutationId,
      parsed.notes as string | undefined,
      parsed.supplierId as string | undefined,
      lines,
      supplierName
    ) as T;
  }

  if (method === 'POST' && path === '/adjustments') {
    const adjBody = parsed as {
      productId: string;
      adjustmentType: 'INCREASE' | 'DECREASE';
      reasonType: string;
      quantity: number;
      unitId?: string;
      note?: string;
    };
    const meta =
      offlineMeta?.kind === 'adjustment'
        ? {
            productName: offlineMeta.productName,
            unitName: offlineMeta.unitName,
            unitConversionValue: offlineMeta.unitConversionValue,
          }
        : { productName: 'Product', unitName: null as string | null, unitConversionValue: 1 };
    const bodyToStore = { ...parsed, clientMutationId };
    await enqueueOutbox({
      id: clientMutationId,
      method: 'POST',
      path,
      bodyJson: JSON.stringify(bodyToStore),
      createdAt: Date.now(),
      attempts: 0,
    });
    return buildSyntheticAdjustment(clientMutationId, adjBody, meta) as T;
  }

  const oid = uuid();
  await enqueueOutbox({
    id: oid,
    method,
    path,
    bodyJson,
    createdAt: Date.now(),
    attempts: 0,
  });
  throw new OfflineQueuedError(undefined, oid);
}

export async function request<T>(
  path: string,
  options: RequestInit & { bodyObject?: unknown } = {}
): Promise<T> {
  const { bodyObject, ...restInit } = options;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(restInit.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const method = (restInit.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

  let bodyJson = '';
  let offlineMeta: OfflineMeta | undefined;

  if (bodyObject !== undefined) {
    const prep = prepareMutationBody(path, method, bodyObject);
    bodyJson = prep.bodyJson;
    offlineMeta = prep.offlineMeta;
  } else if (typeof restInit.body === 'string') {
    bodyJson = restInit.body;
  }

  const fetchInit: RequestInit = {
    ...restInit,
    headers,
    method,
    body:
      method === 'GET' || method === 'DELETE'
        ? undefined
        : bodyJson || (restInit.body as string | undefined),
  };

  const runMutationOffline = async (): Promise<T> => {
    return handleOfflineOrQueueMutation<T>({ path, method, bodyJson, offlineMeta });
  };

  if (typeof window !== 'undefined' && isMutation && !browserReportsOnline()) {
    if (path.startsWith('/auth')) {
      throw new Error('You are offline. Connect to the internet to sign in or register.');
    }
    return runMutationOffline();
  }

  // Abort hung requests so a flaky/“online but no internet” connection can't
  // freeze the UI forever — mutations then fall through to the offline queue.
  const controller = new AbortController();
  const timeoutMs = isMutation ? 9000 : 20000;
  const timer =
    typeof window !== 'undefined'
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;
  fetchInit.signal = controller.signal;

  try {
    const fullUrl = `${API_BASE}/api${path}`;
    const res = await fetch(fullUrl, fetchInit);

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      const apiMessage = messageFromHttpBody(data) || 'Unauthorized';
      // Wrong password / validation on login & register also returns 401 — not an expired session.
      const isCredentialAttempt = path === '/auth/login' || path === '/auth/register';
      if (typeof window !== 'undefined' && !isCredentialAttempt) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new ApiError(apiMessage, 401, data);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg =
        messageFromHttpBody(data) || `Request failed (${res.status})`;
      throw new ApiError(msg, res.status, data);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (e) {
    // Auth must never use the offline outbox. A failed login fetch is usually CORS or wrong API URL,
    // not "offline" — routing it there showed a misleading message.
    const isAbort = (e as { name?: string } | null)?.name === 'AbortError';
    const looksLikeNetworkFailure =
      isAbort ||
      isNetworkError(e) ||
      (e instanceof TypeError && String(e.message).includes('Failed to fetch'));
    if (
      typeof window !== 'undefined' &&
      isMutation &&
      !path.startsWith('/auth') &&
      looksLikeNetworkFailure
    ) {
      try {
        return await runMutationOffline();
      } catch (q) {
        if (q instanceof OfflineQueuedError) throw q;
        throw q;
      }
    }
    if (isAbort) {
      throw new ApiError('Network timed out. Check your connection and try again.', 0, e);
    }
    throw e;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', bodyObject: body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', bodyObject: body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
