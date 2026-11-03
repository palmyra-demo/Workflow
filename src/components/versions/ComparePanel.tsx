import type { WorkflowGraph } from '../../workflow/io/graph';
import type { GraphDiff } from '../../workflow/versioning/versionStore';
import type { WorkflowDraft, WorkflowVersion } from '../../workflow/versioning/versionStore';
import DiagramPreview from '../DiagramPreview';
import { plural, versionName } from './format';
import { btn, card, cardTitle, chip, emptyState, field } from './styles';

interface ComparePanelProps {
  versions: WorkflowVersion[];
  draft: WorkflowDraft | null;
  baseId: string;
  targetId: string;
  baseVersion: WorkflowVersion | null;
  targetVersion: WorkflowVersion | null;
  targetGraph: WorkflowGraph | null;
  sameEntry: boolean;
  diff: GraphDiff | null;
  onBaseChange: (id: string) => void;
  onTargetChange: (id: string) => void;
  onSwap: () => void;
}

const CHANGE_STYLES = {
  added: { badge: 'bg-emerald-50 text-emerald-700', symbol: '+' },
  removed: { badge: 'bg-red-50 text-red-700', symbol: '−' },
  modified: { badge: 'bg-slate-100 text-slate-600', symbol: '~' },
} as const;

function ChangesList({ props }: { props: ComparePanelProps }) {
  const { baseVersion, sameEntry, diff } = props;

  if (!baseVersion) return <div className={emptyState}>Select a base version to see what changed</div>;
  if (sameEntry) return <div className={emptyState}>Choose two different entries to compare</div>;
  if (!diff) return <div className={emptyState}>There is nothing to compare with</div>;
  if (diff.total === 0)
    return <div className={`${emptyState} !text-slate-500`}>No differences between these two</div>;

  const changes = [...diff.added, ...diff.removed, ...diff.modified];
  return (
    <ul className="m-0 list-none divide-y divide-slate-100 p-0">
      {changes.map((change) => {
        const style = CHANGE_STYLES[change.kind];
        return (
          <li key={`${change.kind}-${change.id}`} className="flex items-start gap-3 px-4 py-3">
            <span
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[13px] font-semibold ${style.badge}`}
              aria-label={change.kind}
            >
              {style.symbol}
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[13px] font-medium text-slate-900">
                {change.label}{' '}
                <span className="font-normal text-slate-400">
                  · {change.typeLabel}
                  {change.isConnection ? ' (connection)' : ''}
                </span>
              </p>
              {change.details.map((detail, index) => (
                <p key={index} className="m-0 mt-0.5 text-[12px] text-slate-500">
                  {detail}
                </p>
              ))}
            </div>
            <span className="text-[11px] capitalize text-slate-400">{change.kind}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ComparePanel(props: ComparePanelProps) {
  const { versions, draft, baseId, targetId, baseVersion, targetVersion, targetGraph, sameEntry, diff } =
    props;
  const newestFirst = [...versions].reverse();
  const versionOptions = newestFirst.map((v) => (
    <option key={v.id} value={v.id}>
      {versionName(v)}
    </option>
  ));
  const showPreviews = baseVersion && targetGraph && !sameEntry;

  return (
    <section className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 gap-4 overflow-y-auto overflow-x-hidden p-5 lg:grid-cols-[minmax(0,70%)_minmax(0,30%)] lg:p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="m-0 text-[20px] font-semibold tracking-tight text-slate-900">Compare versions</h2>
          <p className="m-0 mt-1 text-[13px] text-slate-500">
            Pick any two entries. They do not have to be next to each other.
          </p>
        </div>

        <div className={`${card} p-4`}>
          <div className="flex items-end gap-3">
            <label className="block text-[12px] font-medium text-slate-600">
              Base
              <select
                value={baseId}
                onChange={(e) => props.onBaseChange(e.target.value)}
                className={`${field} mt-1.5`}
              >
                <option value="">Select a version…</option>
                {versionOptions}
              </select>
            </label>
            <button
              type="button"
              className={`${btn} !w-9 !px-0`}
              onClick={props.onSwap}
              disabled={targetId === 'draft' || !baseId}
              aria-label="Swap base and target"
              title={targetId === 'draft' ? 'The draft can only be the target' : 'Swap'}
            >
              ⇄
            </button>
            <label className="block text-[12px] font-medium text-slate-600">
              Compare with
              <select
                value={targetId}
                onChange={(e) => props.onTargetChange(e.target.value)}
                className={`${field} mt-1.5`}
              >
                {draft && <option value="draft">Draft</option>}
                {versionOptions}
              </select>
            </label>
          </div>
        </div>

        {showPreviews && (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className={card} aria-label="Base preview">
              <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
                <h3 className={cardTitle}>{versionName(baseVersion)}</h3>
                <span className={chip}>Base</span>
              </header>
              <DiagramPreview
                key={`base-${baseVersion.id}`}
                graph={baseVersion.graph}
                heightClass="h-[320px]"
              />
            </section>
            <section className={card} aria-label="Target preview">
              <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
                <h3 className={cardTitle}>{targetVersion ? versionName(targetVersion) : 'Draft'}</h3>
                <span className={chip}>Compared</span>
              </header>
              <DiagramPreview key={`target-${targetId}`} graph={targetGraph} heightClass="h-[320px]" />
            </section>
          </div>
        )}
      </div>

      <section className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h3 className={cardTitle}>Changes{diff ? ` · ${plural(diff.total, 'change')}` : ''}</h3>
        </header>
        <ChangesList props={props} />
      </section>
    </section>
  );
}
