import { useCallback, useEffect, useState } from 'react';

export type ToastLevel = 'error' | 'info';
export interface ToastMessage {
  message: string;
  level: ToastLevel;
}

const TOAST_DURATION_MS = 5000;

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = useCallback(
    (message: string, level: ToastLevel = 'error') => setToast({ message, level }),
    [],
  );
  const dismiss = useCallback(() => setToast(null), []);

  return { toast, notify, dismiss };
}
