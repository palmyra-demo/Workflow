import { CloseIcon } from '../icons';
import type { ValidationIssue } from '../../workflow/validation';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

interface ValidationPanelProps {
  issues: ValidationIssue[];
  onClose: () => void;
  onSelectIssue: (elementId?: string) => void;
}

export function ValidationPanel({ issues, onClose, onSelectIssue }: ValidationPanelProps) {
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  const isClean = issues.length === 0;

  return (
    <section className="absolute bottom-6 left-1/2 z-40 flex max-h-[42vh] w-[min(720px,calc(100%-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-center gap-3 border-b border-slate-200 px-4 py-2">
        <strong className="text-sm text-slate-900">Validation</strong>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${isClean ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
        >
          {isClean ? 'No issues' : `${plural(errors, 'error')} · ${plural(warnings, 'warning')}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close validation"
          className="ml-auto flex h-10 w-10 cursor-pointer items-center justify-center border-none bg-white p-1 text-slate-500 hover:rounded-full hover:bg-slate-100 hover:text-slate-900"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </header>
      {!isClean && (
        <ul className="m-0 list-none divide-y divide-slate-100 overflow-y-auto p-0">
          {issues.map((issue, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => onSelectIssue(issue.elementId)}
                className="flex w-full items-start gap-3 border border-gray-100/20 px-4 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <span
                  className={`mt-px rounded px-1.5 py-px text-[10px] font-semibold uppercase ${issue.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}
                >
                  {issue.level}
                </span>
                <span>{issue.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
