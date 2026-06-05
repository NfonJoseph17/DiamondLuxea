'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let listeners: ((t: Toast[]) => void)[] = [];
let store: Toast[] = [];

function notify() {
  listeners.forEach((l) => l([...store]));
}

export function toast(message: string, type: Toast['type'] = 'info') {
  const id = Math.random().toString(36).slice(2);
  store = [...store, { id, message, type }];
  notify();
  const duration = type === 'error' ? 6000 : 4000;
  setTimeout(() => {
    store = store.filter((t) => t.id !== id);
    notify();
  }, duration);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-bottom-2',
            t.type === 'success' && 'border-green-200 bg-green-50 text-green-800',
            t.type === 'error' && 'border-red-200 bg-red-50 text-red-800',
            t.type === 'info' && 'border-border bg-background text-foreground'
          )}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => {
              store = store.filter((s) => s.id !== t.id);
              notify();
            }}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
