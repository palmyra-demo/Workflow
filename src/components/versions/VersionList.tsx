import type { WorkflowDraft, WorkflowVersion } from '../../workflow/versioning/versionStore';
import type { View } from '../../workflow/versioning/useVersioning';
import { dateLabel } from './format';
import { chip, emptyState, field, focus } from './styles';

export type ListEntry = { kind: 'draft' } | { kind: 'version'; version: WorkflowVersion };

interface VersionListProps {
  entries: ListEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  latestId?: string;
  view: View;
  draft: WorkflowDraft | null;
  draftEdited: boolean;
  draftSubtitle: string;
  totalVersions: number;
  matchingVersions: number;
}

export function VersionList({
  entries,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  latestId,
  view,
  draft,
  draftEdited,
  draftSubtitle,
  totalVersions,
  matchingVersions,
}: VersionListProps) {
  const query = search.trim();

  return (
    <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-3">
        <input
          aria-label="Search versions"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search versions or release notes"
          className={field}
        />
      </div>
      <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0 scrollbar-thin-custom">
        {entries.map((entry) => {
          const isDraft = entry.kind === 'draft';
          const id = isDraft ? 'draft' : entry.version.id;
          const selected = selectedId === id;
          const isLatest = !isDraft && latestId === entry.version.id;
          const onCanvas = isDraft
            ? view.kind === 'draft'
            : view.kind === 'version' && view.id === entry.version.id;

          const title = isDraft ? 'Draft' : `v${entry.version.version}`;
          const date = isDraft ? draft!.updatedAt : entry.version.createdAt;
          const summary = isDraft
            ? `${draftSubtitle}${draftEdited ? ' · unpublished changes' : ''}`
            : entry.version.comment || <span className="text-slate-400">No release notes</span>;

          return (
            <li key={id} className="relative">
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={selected}
                className={`block w-full cursor-pointer border-0 border-b border-solid border-slate-100 p-2 text-left [font-family:inherit] transition ${focus} ${
                  selected ? 'bg-blue-50/70 shadow-[inset_3px_0_0_#3061c4]' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-900">{title}</span>
                  {!isDraft && entry.version.versionTag && (
                    <span className={`${chip} max-w-[120px] truncate`}>{entry.version.versionTag}</span>
                  )}
                  <span className="ml-auto flex items-center gap-1.5">
                    {isLatest && <span className="text-[11px] font-semibold text-accent">Latest</span>}
                    {onCanvas && <span className={chip}>On canvas</span>}
                  </span>
                </div>
                <p className="m-0 mt-1 line-clamp-2 text-[12px] leading-[18px] text-slate-600">{summary}</p>
                <p className="m-0 mt-1 text-[11px] text-slate-400">{dateLabel(date)}</p>
              </button>
            </li>
          );
        })}
        {!entries.length && (
          <li className={emptyState}>
            {totalVersions
              ? 'No versions match your search.'
              : 'No versions yet. Create the first one from the draft.'}
          </li>
        )}
        {draft && !matchingVersions && totalVersions > 0 && query && (
          <li className={emptyState}>No published versions match your search.</li>
        )}
      </ul>
    </aside>
  );
}
