import { AlertIcon } from '../icons';
import type { ToastMessage } from '../../hooks/useToast';

const LEVEL_STYLES = {
  info: 'border-[#393939] bg-[#393939] text-white',
  error: 'border-[#da1e28] bg-white text-[#a2191f]',
};

export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      onClick={onDismiss}
      className={`absolute bottom-6 left-1/2 z-[200] flex max-w-[min(560px,90%)] -translate-x-1/2 cursor-pointer animate-slide-up items-start gap-2.5 rounded-sm border px-4 py-3 text-[13px] shadow-lg ${LEVEL_STYLES[toast.level === 'info' ? 'info' : 'error']}`}
    >
      <AlertIcon className="mt-px h-4 w-4 shrink-0" />
      <span>{toast.message}</span>
    </div>
  );
}
