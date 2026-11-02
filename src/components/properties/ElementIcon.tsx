import { categoryOf, WorkflowType } from '../../workflow/types';

export function ElementIcon({ type }: { type: WorkflowType }) {
  const category = categoryOf(type);
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let glyph;
  switch (category) {
    case 'event': glyph = <circle cx="16" cy="16" r="9" strokeWidth={type.includes('end') || type.includes('End') ? 3 : 1.6} />; break;
    case 'gateway': glyph = <path d="M16 5 27 16 16 27 5 16z" />; break;
    case 'task': glyph = <rect x="4" y="8" width="24" height="16" rx="3" />; break;
    case 'data': glyph = <path d="M9 4h10l5 5v19H9zM19 4v5h5" />; break;
    case 'container': glyph = <><rect x="4" y="7" width="24" height="18" /><path d="M10 7v18" /></>; break;
    case 'artifact': glyph = <path d="M20 6h-8v20h8" />; break;
    default: glyph = <path d="M4 22 14 12l5 5 9-9M22 8h6v6" />;
  }
  return <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" {...common}>{glyph}</svg>;
}
