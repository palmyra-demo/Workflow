import { useEffect, useMemo, useState } from 'react';
import { HistoryIcon, PublishIcon } from '../icons';
import { serializeToJson } from '../../workflow/io/json';
import type { ToastLevel } from '../../hooks/useToast';
import { downloadFile } from '../../utils/download';
import type { Versioning } from '../../workflow/versioning/useVersioning';
import { diffGraphs, WorkflowVersion } from '../../workflow/versioning/versionStore';
import { ComparePanel } from './ComparePanel';
import { elementBreakdown, plural, versionFileName, versionName } from './format';
import { PublishForm } from './PublishForm';
import { btnGhost, btnPrimary, tabClass } from './styles';
import { VersionDetails } from './VersionDetails';
import { ListEntry, VersionList } from './VersionList';

interface VersionHistoryPageProps {
  versioning: Versioning;
  onBack: () => void;
  onEditAsDraft: (versionId: string) => void;
  notify: (message: string, level: ToastLevel) => void;
  startWithPublish?: boolean;
}

type Tab = 'versions' | 'compare';

export default function VersionHistoryPage({
  versioning,
  onBack,
  onEditAsDraft,
  notify,
  startWithPublish,
}: VersionHistoryPageProps) {
  const { versions, latest, draft, draftEdited, canPublish, view, storageError } = versioning;

  const [tab, setTab] = useState<Tab>('versions');
  const [selectedId, setSelectedId] = useState<string>(view.kind === 'version' ? view.id : 'draft');
  const [baseId, setBaseId] = useState('');
  const [targetId, setTargetId] = useState('draft');
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState('');
  const [tag, setTag] = useState('');
  const [showPublish, setShowPublish] = useState(Boolean(startWithPublish));

  const hasVersion = (id: string) => versions.some((v) => v.id === id);
  const fallbackId = draft ? 'draft' : (latest?.id ?? '');
  const resolveId = (id: string) => {
    if (id === 'draft') return fallbackId;
    return hasVersion(id) ? id : fallbackId;
  };

  const activeSelectedId = resolveId(selectedId);
  const activeTargetId = resolveId(targetId);
  const activeBaseId = hasVersion(baseId) ? baseId : '';

  const selectedVersion = versions.find((v) => v.id === activeSelectedId) ?? null;
  const isDraftSelected = activeSelectedId === 'draft';
  const selectedGraph = isDraftSelected ? (draft?.graph ?? null) : (selectedVersion?.graph ?? null);
  const breakdown = useMemo(() => elementBreakdown(selectedGraph), [selectedGraph]);

  const query = search.trim().toLowerCase();
  const matchingVersions = [...versions]
    .reverse()
    .filter((v) => `${versionName(v)} ${v.comment}`.toLowerCase().includes(query));
  const entries: ListEntry[] = [
    ...(draft ? [{ kind: 'draft' as const }] : []),
    ...matchingVersions.map((version) => ({ kind: 'version' as const, version })),
  ];

  const baseVersion = versions.find((v) => v.id === activeBaseId) ?? null;
  const targetVersion = versions.find((v) => v.id === activeTargetId) ?? null;
  const targetGraph = activeTargetId === 'draft' ? (draft?.graph ?? null) : (targetVersion?.graph ?? null);
  const sameEntry = Boolean(activeBaseId) && activeBaseId === activeTargetId;
  const diff = useMemo(
    () => (baseVersion && targetGraph && !sameEntry ? diffGraphs(baseVersion.graph, targetGraph) : null),
    [baseVersion, targetGraph, sameEntry],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        target.blur();
        return;
      }
      if (showPublish) setShowPublish(false);
      else onBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPublish, onBack]);

  const viewOnCanvas = (version: WorkflowVersion) => {
    const result = versioning.openVersion(version.id);
    if (!result.ok) return notify(result.reason, 'error');
    onBack();
    notify(`Viewing ${versionName(version)} · read-only.`, 'info');
  };

  const openDraftInModeler = () => {
    const result = versioning.openDraft();
    if (!result.ok) return notify(result.reason, 'error');
    onBack();
  };

  const discardDraft = () => {
    if (!confirm('Discard the draft and go back to the published version? Your draft changes will be lost.'))
      return;
    const result = versioning.discardDraft();
    if (!result.ok) return notify(result.reason, 'error');
    setSelectedId(latest?.id ?? 'draft');
    notify('Draft discarded.', 'info');
  };

  const deleteVersion = (version: WorkflowVersion) => {
    if (!confirm(`Delete ${versionName(version)} permanently? Published versions cannot be recovered.`))
      return;
    versioning.deleteVersion(version.id);
    notify(`Deleted ${versionName(version)}.`, 'info');
  };

  const createVersion = () => {
    const result = versioning.publish({ comment, versionTag: tag });
    if (!result.ok) return notify(result.reason, result.code === 'unchanged' ? 'info' : 'error');
    setComment('');
    setTag('');
    setShowPublish(false);
    setSelectedId(result.version.id);
    notify(`Created ${versionName(result.version)} · it is now read-only.`, 'info');
  };

  const compareWithPrevious = (version: WorkflowVersion) => {
    const index = versions.findIndex((v) => v.id === version.id);
    if (index > 0) {
      setBaseId(versions[index - 1].id);
      setTargetId(version.id);
    } else if (draft) {
      setBaseId(version.id);
      setTargetId('draft');
    } else if (versions[index + 1]) {
      setBaseId(version.id);
      setTargetId(versions[index + 1].id);
    } else {
      return notify('There is no other version to compare with yet.', 'info');
    }
    setTab('compare');
  };

  const swapCompare = () => {
    if (activeTargetId === 'draft' || !activeBaseId) return;
    setBaseId(activeTargetId);
    setTargetId(activeBaseId);
  };

  const draftSubtitle = draft?.basedOn ? `Based on v${draft.basedOn}` : 'Not published yet';
  const publishTitle = !draft
    ? 'Open “Edit as draft” first'
    : !canPublish
      ? 'No changes since the latest version'
      : undefined;

  return (
    <main
      className="absolute inset-0 z-[100] flex flex-col bg-slate-100 text-slate-800"
      aria-label="Workflow versions page"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5">
        <button type="button" onClick={onBack} className={btnGhost}>
          <span aria-hidden="true">←</span> Back to modeler
        </button>
        <span className="h-6 w-px bg-slate-200" />
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <HistoryIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <h1 className="m-0 text-[15px] font-semibold tracking-tight text-slate-900">Versions</h1>
          <p className="m-0 text-[12px] text-slate-500">
            {plural(versions.length, 'published version')}
            {draft ? ' · 1 draft' : ''}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPublish((open) => !open)}
            disabled={!draft || !canPublish}
            className={`${btnPrimary} ml-1`}
            title={publishTitle}
          >
            <PublishIcon /> Create version
          </button>
        </div>
      </header>

      {showPublish && (
        <PublishForm
          tag={tag}
          comment={comment}
          canPublish={canPublish}
          onTagChange={setTag}
          onCommentChange={setComment}
          onSubmit={createVersion}
          onCancel={() => setShowPublish(false)}
        />
      )}

      <nav
        className="flex h-11 shrink-0 items-stretch border-b border-slate-200 bg-white px-3"
        aria-label="Versions sections"
      >
        <button type="button" onClick={() => setTab('versions')} className={tabClass(tab === 'versions')}>
          Versions{' '}
          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-medium text-slate-600">
            {versions.length + (draft ? 1 : 0)}
          </span>
        </button>
        <button type="button" onClick={() => setTab('compare')} className={tabClass(tab === 'compare')}>
          Compare versions
        </button>
        <span className="ml-auto hidden items-center gap-1.5 self-center pr-2 text-[12px] text-slate-500 md:inline-flex">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Published versions are read-only
        </span>
      </nav>

      {storageError && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-[12px] text-amber-900">
          {storageError}
        </div>
      )}

      {tab === 'versions' ? (
        <div className="grid min-h-0 flex-1 sm:grid-cols-1 grid-cols-[340px_minmax(0,1fr)]">
          <VersionList
            entries={entries}
            selectedId={activeSelectedId}
            onSelect={setSelectedId}
            search={search}
            onSearchChange={setSearch}
            latestId={latest?.id}
            view={view}
            draft={draft}
            draftEdited={draftEdited}
            draftSubtitle={draftSubtitle}
            totalVersions={versions.length}
            matchingVersions={matchingVersions.length}
          />
          <section className="min-h-0 min-w-0 overflow-y-auto p-5 lg:p-6 scrollbar-thin-custom">
            <VersionDetails
              version={selectedVersion}
              draft={draft}
              isDraft={isDraftSelected}
              isLatest={!!selectedVersion && latest?.id === selectedVersion.id}
              graph={selectedGraph}
              breakdown={breakdown}
              draftEdited={draftEdited}
              draftSubtitle={draftSubtitle}
              hasVersions={versions.length > 0}
              previewKey={activeSelectedId}
              onViewOnCanvas={viewOnCanvas}
              onOpenDraft={openDraftInModeler}
              onEditAsDraft={onEditAsDraft}
              onCompare={compareWithPrevious}
              onExport={(version) =>
                downloadFile(serializeToJson(version.graph), versionFileName(version), 'application/json')
              }
              onDelete={deleteVersion}
              onDiscardDraft={discardDraft}
            />
          </section>
        </div>
      ) : (
        <ComparePanel
          versions={versions}
          draft={draft}
          baseId={activeBaseId}
          targetId={activeTargetId}
          baseVersion={baseVersion}
          targetVersion={targetVersion}
          targetGraph={targetGraph}
          sameEntry={sameEntry}
          diff={diff}
          onBaseChange={setBaseId}
          onTargetChange={setTargetId}
          onSwap={swapCompare}
        />
      )}
    </main>
  );
}
