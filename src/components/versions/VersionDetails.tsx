import type { WorkflowGraph } from '../../workflow/io/graph';
import type { WorkflowDraft, WorkflowVersion } from '../../workflow/versioning/versionStore';
import { CompareIcon, DownloadIcon, EyeIcon, PencilIcon, TrashIcon } from '../icons';
import DiagramPreview from '../DiagramPreview';
import { dateLabel, shortDate, versionName } from './format';
import { btn, btnDanger, btnPrimary, card, cardTitle, chip } from './styles';

interface VersionDetailsProps {
  version: WorkflowVersion | null;
  draft: WorkflowDraft | null;
  isDraft: boolean;
  isLatest: boolean;
  graph: WorkflowGraph | null;
  breakdown: Array<[string, number]>;
  draftEdited: boolean;
  draftSubtitle: string;
  hasVersions: boolean;
  previewKey: string;
  onViewOnCanvas: (version: WorkflowVersion) => void;
  onOpenDraft: () => void;
  onEditAsDraft: (versionId: string) => void;
  onCompare: (version: WorkflowVersion) => void;
  onExport: (version: WorkflowVersion) => void;
  onDelete: (version: WorkflowVersion) => void;
  onDiscardDraft: () => void;
}

function detailRows(props: VersionDetailsProps): Array<[string, string]> {
  const { version, draft, isDraft, graph } = props;
  const date = isDraft ? draft?.updatedAt : version?.createdAt;

  const rows: Array<[string, string]> = [
    ['Status', isDraft ? 'Draft' : 'Published'],
    ['Version', isDraft ? '—' : `v${version!.version}`],
    ['Tag', !isDraft && version?.versionTag ? version.versionTag : '—'],
    [isDraft ? 'Last saved' : 'Created', date ? shortDate(date) : '—'],
  ];
  if (isDraft) rows.push(['Based on', draft?.basedOn ? `v${draft.basedOn}` : '—']);
  rows.push(['Elements', String(graph?.nodes.length ?? 0)]);
  rows.push(['Connections', String(graph?.edges.length ?? 0)]);
  if (!isDraft && version) rows.push(['Fingerprint', version.checksum.slice(0, 8)]);
  return rows;
}

function Header(props: VersionDetailsProps) {
  const { version, draft, isDraft, isLatest, draftEdited, draftSubtitle, hasVersions } = props;
  const date = isDraft ? draft?.updatedAt : version?.createdAt;
  const canDiscardDraft = !!draft && draft.basedOn !== null && hasVersions;

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 text-[20px] font-semibold tracking-tight text-slate-900">
              {isDraft ? 'Draft' : versionName(version!)}
            </h2>
            {isDraft ? (
              <span className={chip}>Working copy</span>
            ) : (
              <>
                {isLatest && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-accent">
                    Latest
                  </span>
                )}
                <span className={chip}>Read-only</span>
              </>
            )}
          </div>
          <p className="m-0 mt-1.5 text-[13px] text-slate-500">
            {date ? dateLabel(date) : ''}
            {isDraft ? ` · ${draftSubtitle}` : ''}
          </p>
        </div>
        {version && (
          <button type="button" className={btnPrimary} onClick={() => props.onViewOnCanvas(version)}>
            <EyeIcon /> View on canvas
          </button>
        )}
        {isDraft && (
          <button type="button" className={btnPrimary} onClick={props.onOpenDraft}>
            <PencilIcon /> Open draft in modeler
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-2.5">
        {version && (
          <>
            <button type="button" className={btn} onClick={() => props.onEditAsDraft(version.id)}>
              <PencilIcon /> {draft ? 'Restore as draft' : 'Edit as draft'}
            </button>
            <button type="button" className={btn} onClick={() => props.onCompare(version)}>
              <CompareIcon /> Compare
            </button>
            <button type="button" className={btn} onClick={() => props.onExport(version)}>
              <DownloadIcon /> Export JSON
            </button>
            <button type="button" className={btnDanger} onClick={() => props.onDelete(version)}>
              <TrashIcon /> Delete
            </button>
          </>
        )}
        {isDraft && (
          <>
            <span className="text-[12px] text-slate-500">
              {draftEdited ? 'Has changes that are not published yet.' : 'No unpublished changes.'}
            </span>
            {canDiscardDraft && (
              <button type="button" className={btnDanger} onClick={props.onDiscardDraft}>
                <TrashIcon /> Discard draft
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Sidebar(props: VersionDetailsProps) {
  const rows = detailRows(props);

  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <section className={card}>
        <header className="border-b border-slate-200 px-4 py-3">
          <h3 className={cardTitle}>Details</h3>
        </header>
        <dl className="m-0 divide-y divide-slate-100 px-4 text-[13px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-slate-500">{label}</dt>
              <dd
                className={`m-0 max-w-[140px] truncate text-right font-medium text-slate-800 ${label === 'Fingerprint' ? 'font-mono text-[12px]' : ''}`}
                title={value}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {props.breakdown.length > 0 && (
        <section className={card}>
          <header className="border-b border-slate-200 px-4 py-3">
            <h3 className={cardTitle}>Elements by type</h3>
          </header>
          <ul className="m-0 list-none divide-y divide-slate-100 p-0 px-4 text-[13px] !overflow-auto">
            {props.breakdown.map(([name, count]) => (
              <li key={name} className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">{name}</span>
                <span className="font-medium tabular-nums text-slate-800">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

export function VersionDetails(props: VersionDetailsProps) {
  if (!props.isDraft && !props.version) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-slate-400">
        Select a version from the list.
      </div>
    );
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Header {...props} />
        <section className={`${card} h-full`} aria-label="Diagram preview">
          <DiagramPreview key={props.previewKey} graph={props.graph} />
        </section>
      </div>
      <Sidebar {...props} />
    </div>
  );
}
