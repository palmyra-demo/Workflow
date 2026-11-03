import { LockIcon, PencilIcon, PublishIcon } from '../icons';
import type { Versioning } from '../../workflow/versioning/useVersioning';

const PRIMARY_BUTTON =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border-none bg-accent px-3 text-[12px] font-medium text-white [font:inherit] hover:bg-[#2753ad]';
const SECONDARY_BUTTON =
  'inline-flex h-7 cursor-pointer items-center rounded-full border border-slate-300 bg-white px-3 text-[12px] text-slate-700 [font:inherit] hover:bg-slate-50';

interface ModePillProps {
  versioning: Versioning;
  onBackToDraft: () => void;
  onEditAsDraft: (versionId: string) => void;
  onPublish: () => void;
}

export function ModePill({ versioning, onBackToDraft, onEditAsDraft, onPublish }: ModePillProps) {
  const { readOnly, viewedVersion, draft, draftBase } = versioning;
  const isViewingVersion = readOnly && !!viewedVersion;

  const basedOnLabel = draftBase
    ? `Based on v${draftBase.version}`
    : draft?.basedOn
      ? `Based on v${draft.basedOn}`
      : 'Not published yet';

  return (
    <div
      data-testid="mode-pill"
      className={`absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-white py-1 pl-3 pr-1.5 text-[12px] shadow-md ${readOnly ? 'border-slate-300' : 'border-amber-200'}`}
    >
      {isViewingVersion ? (
        <>
          <LockIcon className="h-3.5 w-3.5 text-slate-500" />
          <strong className="text-slate-900">
            v{viewedVersion.version}
            {viewedVersion.versionTag ? ` · ${viewedVersion.versionTag}` : ''}
          </strong>
          <span className="text-slate-500">Published · read-only</span>
          {draft ? (
            <>
              <button type="button" onClick={onBackToDraft} className={PRIMARY_BUTTON}>
                <PencilIcon className="h-3.5 w-3.5" /> Back to draft
              </button>
              <button
                type="button"
                onClick={() => onEditAsDraft(viewedVersion.id)}
                title="Replace your current draft with this version"
                className={SECONDARY_BUTTON}
              >
                Restore as draft
              </button>
            </>
          ) : (
            <button type="button" onClick={() => onEditAsDraft(viewedVersion.id)} className={PRIMARY_BUTTON}>
              <PencilIcon className="h-3.5 w-3.5" /> Edit as draft
            </button>
          )}
        </>
      ) : (
        <>
          <span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase text-amber-800">
            Draft
          </span>
          <span className="text-slate-500">{basedOnLabel} · autosaved</span>
          <button type="button" onClick={onPublish} className={PRIMARY_BUTTON}>
            <PublishIcon className="h-3.5 w-3.5" /> Publish
          </button>
        </>
      )}
    </div>
  );
}
