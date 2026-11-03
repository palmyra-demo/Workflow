import { Fragment } from 'react';
import type { WorkflowModeler } from '../../workflow/WorkflowModeler';

export interface Crumb {
  id: string | null;
  name: string;
}

export function DrillBreadcrumb({ crumbs, modeler }: { crumbs: Crumb[]; modeler: WorkflowModeler }) {
  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Sub-process path"
      data-testid="drill-breadcrumb"
      className="absolute left-[72px] top-3 z-30 flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[12px] shadow-md"
    >
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb.id ?? 'root'}>
          {index > 0 && <span className="text-slate-400">›</span>}
          {index < crumbs.length - 1 ? (
            <button
              type="button"
              onClick={() => modeler.get('subProcessView').goTo(crumb.id)}
              className="cursor-pointer border-none bg-transparent p-0 text-accent [font:inherit] hover:underline"
            >
              {crumb.name}
            </button>
          ) : (
            <strong className="text-slate-900">{crumb.name}</strong>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
