import { useEffect, useMemo, useRef, useState } from 'react';
import { CompareIcon, DownloadIcon, EyeIcon, HistoryIcon, PencilIcon, PublishIcon, TrashIcon } from './icons';
import DiagramPreview from './DiagramPreview';
import type { Versioning } from '../workflow/versioning/useVersioning';
import type { WorkflowGraph } from '../workflow/io/graph';
import { diffGraphs, parseHistory, WorkflowVersion } from '../workflow/versioning/versionStore';
import { serializeToJson } from '../workflow/io/json';
import { categoryOf } from '../workflow/types';

interface Props {
  versioning: Versioning;
  onBack: () => void;
  onEditAsDraft: (versionId: string) => void;
  notify: (message: string, level: 'error' | 'info') => void;
  /** open with the "Create version" form already expanded */
  startWithPublish?: boolean;
}


const dateLabel = (value: string) =>
  new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const shortDate = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const versionName = (v: WorkflowVersion) => `v${v.version}${v.versionTag ? ` · ${v.versionTag}` : ''}`;
const safeName = (s: string) => s.replace(/[^\w.-]+/g, '_');

function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  // revoking straight away can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const GROUPS = ['Events', 'Tasks', 'Sub-processes', 'Gateways', 'Data', 'Pools & lanes', 'Annotations & groups'] as const;
function elementBreakdown(graph: WorkflowGraph | null): Array<[string, number]> {
  const label = { event: 'Events', task: 'Tasks', gateway: 'Gateways', data: 'Data', container: 'Pools & lanes', artifact: 'Annotations & groups', connection: 'Tasks' } as const;
  const counts = new Map<string, number>();
  for (const n of graph?.nodes ?? []) {
    const key = /(subprocess|transaction)$/i.test(n.type) ? 'Sub-processes' : label[categoryOf(n.type)];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return GROUPS.filter((g) => counts.has(g)).map((g) => [g, counts.get(g)!]);
}

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';
const base = `inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 text-[13px] font-medium [font-family:inherit] transition disabled:cursor-not-allowed disabled:opacity-45 ${focus}`;
const btn = `${base} border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:shadow-none`;
const btnPrimary = `${base} border border-accent bg-accent text-white shadow-sm hover:border-[#2753ad] hover:bg-[#2753ad] disabled:shadow-none`;
const btnGhost = `${base} border border-transparent bg-transparent px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
const field = `h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 shadow-sm outline-none [font-family:inherit] placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/25`;
const card = 'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm';
const cardTitle = 'm-0 text-[13px] font-semibold text-slate-900';
const chip = 'inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600';
const empty = 'px-6 py-10 text-center text-[13px] text-slate-400';


export default function VersionHistoryPage({ versioning, onBack, onEditAsDraft, notify, startWithPublish }: Props) {
  const { versions, latest, draft, draftEdited, canPublish, view, storageError } = versioning;
  const [tab, setTab] = useState<'versions' | 'compare'>('versions');
  const [selectedId, setSelectedId] = useState<string>(view.kind === 'version' ? view.id : 'draft');
  const [baseId, setBaseId] = useState('');
  const [targetId, setTargetId] = useState('draft');
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState('');
  const [tag, setTag] = useState('');
  const [showPublish, setShowPublish] = useState(Boolean(startWithPublish));
  const importRef = useRef<HTMLInputElement | null>(null);

  const newestFirst = useMemo(() => [...versions].reverse(), [versions]);

  const fallbackId = draft ? 'draft' : latest?.id ?? '';
  const effSelected = selectedId === 'draft' ? (draft ? 'draft' : fallbackId) : versions.some((v) => v.id === selectedId) ? selectedId : fallbackId;
  const effTarget = targetId === 'draft' ? (draft ? 'draft' : latest?.id ?? '') : versions.some((v) => v.id === targetId) ? targetId : fallbackId;
  const effBase = versions.some((v) => v.id === baseId) ? baseId : '';

  const selectedVersion = effSelected === 'draft' ? null : versions.find((v) => v.id === effSelected) ?? null;
  const isDraftSelected = effSelected === 'draft';
  const selectedGraph = isDraftSelected ? draft?.graph ?? null : selectedVersion?.graph ?? null;
  const selectedDate = isDraftSelected ? draft?.updatedAt : selectedVersion?.createdAt;
  const breakdown = useMemo(() => elementBreakdown(selectedGraph), [selectedGraph]);

  const q = search.trim().toLowerCase();
  const filtered = newestFirst.filter((v) => `${versionName(v)} ${v.comment}`.toLowerCase().includes(q));
  const entries: Array<{ kind: 'draft' } | { kind: 'version'; v: WorkflowVersion }> = [
    ...(draft ? [{ kind: 'draft' as const }] : []),
    ...filtered.map((v) => ({ kind: 'version' as const, v })),
  ];

  const baseVersion = versions.find((v) => v.id === effBase) ?? null;
  const targetVersion = effTarget === 'draft' ? null : versions.find((v) => v.id === effTarget) ?? null;
  const targetGraph = effTarget === 'draft' ? draft?.graph ?? null : targetVersion?.graph ?? null;
  const sameEntry = Boolean(effBase) && effBase === effTarget;
  const diff = useMemo(() => (baseVersion && targetGraph && !sameEntry ? diffGraphs(baseVersion.graph, targetGraph) : null), [baseVersion, targetGraph, sameEntry]);
  const changed = diff ? [...diff.added, ...diff.removed, ...diff.modified] : [];

  // Esc: leave a field, then close the form, then the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) { el.blur(); return; }
      if (showPublish) setShowPublish(false); else onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPublish, onBack]);

  /* ---- actions ---- */

  const viewOnCanvas = (v: WorkflowVersion) => {
    const r = versioning.openVersion(v.id);
    if (!r.ok) { notify(r.reason, 'error'); return; }
    onBack();
    notify(`Viewing ${versionName(v)} · read-only.`, 'info');
  };
  const openDraftInModeler = () => {
    const r = versioning.openDraft();
    if (!r.ok) { notify(r.reason, 'error'); return; }
    onBack();
  };
  const discardDraft = () => {
    if (!confirm('Discard the draft and go back to the published version? Your draft changes will be lost.')) return;
    const r = versioning.discardDraft();
    if (!r.ok) { notify(r.reason, 'error'); return; }
    setSelectedId(latest?.id ?? 'draft');
    notify('Draft discarded.', 'info');
  };
  const deleteVersion = (v: WorkflowVersion) => {
    if (!confirm(`Delete ${versionName(v)} permanently? Published versions cannot be recovered.`)) return;
    versioning.deleteVersion(v.id);
    notify(`Deleted ${versionName(v)}.`, 'info');
  };
  const createVersion = () => {
    const r = versioning.publish({ comment, versionTag: tag });
    if (!r.ok) { notify(r.reason, r.code === 'unchanged' ? 'info' : 'error'); return; }
    setComment(''); setTag(''); setShowPublish(false); setSelectedId(r.version.id);
    notify(`Created ${versionName(r.version)} · it is now read-only.`, 'info');
  };
  const compareWithPrevious = (v: WorkflowVersion) => {
    const i = versions.findIndex((x) => x.id === v.id);
    if (i > 0) { setBaseId(versions[i - 1].id); setTargetId(v.id); }
    else if (draft) { setBaseId(v.id); setTargetId('draft'); }
    else if (versions[i + 1]) { setBaseId(v.id); setTargetId(versions[i + 1].id); }
    else { notify('There is no other version to compare with yet.', 'info'); return; }
    setTab('compare');
  };
  const swapCompare = () => {
    if (effTarget === 'draft' || !effBase) return;
    setBaseId(effTarget); setTargetId(effBase);
  };
  const importHistory = async (file: File) => {
    try {
      const incoming = parseHistory(await file.text());
      if ((versions.length || draft) && !confirm(`Replace the current history (${plural(versions.length, 'version')}${draft ? ' + draft' : ''}) with the imported one (${plural(incoming.versions.length, 'version')}${incoming.draft ? ' + draft' : ''})?`)) return;
      versioning.replaceHistory(incoming);
      setSelectedId('draft'); setBaseId(''); setTargetId('draft');
      notify(`Imported ${plural(incoming.versions.length, 'version')}.`, 'info');
    } catch (e) {
      notify(`Import failed: ${(e as Error).message}`, 'error');
    }
  };

  const tabClass = (active: boolean) =>
    `relative flex h-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 text-[13px] [font-family:inherit] transition ${focus} ${active ? 'font-semibold text-slate-900 shadow-[inset_0_-2px_0_#3061c4]' : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`;
  const draftSubtitle = draft?.basedOn ? `Based on v${draft.basedOn}` : 'Not published yet';

  return (
    <main className="fixed inset-0 z-[100] flex flex-col bg-slate-100 text-slate-800" aria-label="Workflow versions page">
      {/* header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5">
        <button type="button" onClick={onBack} className={btnGhost}><span aria-hidden="true">←</span> Back to modeler</button>
        <span className="h-6 w-px bg-slate-200" />
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600"><HistoryIcon className="h-4 w-4" /></span>
        <div className="min-w-0 leading-tight">
          <h1 className="m-0 text-[15px] font-semibold tracking-tight text-slate-900">Versions</h1>
          <p className="m-0 text-[12px] text-slate-500">{plural(versions.length, 'published version')}{draft ? ' · 1 draft' : ''}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {/* <button type="button" className={btnGhost} disabled={!versions.length && !draft} onClick={() => downloadText(versioning.exportHistory(), 'workflow-history.json')} title="Download the whole history as one file"><DownloadIcon /> Export history</button>
          <button type="button" className={btnGhost} onClick={() => importRef.current?.click()} title="Replace the history with a file exported earlier"><UploadIcon /> Import history</button> */}
          <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importHistory(f); e.currentTarget.value = ''; }} />
          <button type="button" onClick={() => setShowPublish((v) => !v)} disabled={!draft || !canPublish} className={`${btnPrimary} ml-1`} title={!draft ? 'Open “Edit as draft” first' : !canPublish ? 'No changes since the latest version' : undefined}><PublishIcon /> Create version</button>
        </div>
      </header>

      {showPublish && (
        <section className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-end gap-3">
            <div className="w-[200px]"><label htmlFor="ver-tag" className="mb-1.5 block text-[12px] font-medium text-slate-600">Version tag <span className="font-normal text-slate-400">(optional)</span></label><input id="ver-tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. 1.2.0" className={field} /></div>
            <div className="min-w-[260px] flex-1"><label htmlFor="ver-notes" className="mb-1.5 block text-[12px] font-medium text-slate-600">Release notes <span className="font-normal text-slate-400">(optional)</span></label><input id="ver-notes" autoFocus value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && canPublish) createVersion(); }} placeholder="Describe what changed in this version" className={field} /></div>
            <button type="button" className={btnPrimary} onClick={createVersion} disabled={!canPublish}>Create version</button>
            <button type="button" className={btn} onClick={() => setShowPublish(false)}>Cancel</button>
          </div>
        </section>
      )}

      {/* tabs */}
      <nav className="flex h-11 shrink-0 items-stretch border-b border-slate-200 bg-white px-3" aria-label="Versions sections">
        <button type="button" onClick={() => setTab('versions')} className={tabClass(tab === 'versions')}>Versions <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-medium text-slate-600">{versions.length + (draft ? 1 : 0)}</span></button>
        <button type="button" onClick={() => setTab('compare')} className={tabClass(tab === 'compare')}>Compare versions</button>
        <span className="ml-auto hidden items-center gap-1.5 self-center pr-2 text-[12px] text-slate-500 md:inline-flex"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>Published versions are read-only</span>
      </nav>

      {storageError && <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-[12px] text-amber-900">{storageError}</div>}

      {tab === 'versions' ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white ">
            <div className="border-b border-slate-200 p-3"><input aria-label="Search versions" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search versions or release notes" className={field} /></div>
            <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0 scrollbar-thin-custom">
              {entries.map((entry
                
              ) => {
                const isDraftRow = entry.kind === 'draft';
                const id = isDraftRow ? 'draft' : entry.v.id;
                const selected = effSelected === id;
                const isLatest = !isDraftRow && latest?.id === entry.v.id;
                const onCanvas = isDraftRow ? view.kind === 'draft' : view.kind === 'version' && view.id === entry.v.id;
                return (
                  <li key={id} className="relative">
                    {/* <span aria-hidden="true" className={`absolute left-[10px] w-px bg-slate-200 ${first ? 'top-[22px]' : 'top-0'} ${last ? 'h-[22px]' : 'bottom-0'}`} />
                    <span aria-hidden="true"
                      className={`absolute left-5 top-4 z-10 h-[11px] w-[11px] rounded-full border-2 ${isDraftRow ? 'border-slate-400 bg-white' : isLatest ? 'border-accent bg-accent' : 'border-slate-300 bg-slate-300'} ring-4 ring-white`} /> */}
                    <button type="button" onClick={() => setSelectedId(id)} aria-current={selected}
                      className={`block w-full cursor-pointer border-0 border-b border-solid border-slate-100 p-2 text-left [font-family:inherit] transition ${focus} ${selected ? 'bg-blue-50/70 shadow-[inset_3px_0_0_#3061c4]' : 'bg-white hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-900">{isDraftRow ? 'Draft' : `v${entry.v.version}`}</span>
                        {!isDraftRow && entry.v.versionTag && <span className={`${chip} max-w-[120px] truncate`}>{entry.v.versionTag}</span>}
                        <span className="ml-auto flex items-center gap-1.5">
                          {isLatest && <span className="text-[11px] font-semibold text-accent">Latest</span>}
                          {onCanvas && <span className={chip}>On canvas</span>}
                        </span>
                      </div>
                      <p className="m-0 mt-1 line-clamp-2 text-[12px] leading-[18px] text-slate-600">{isDraftRow ? `${draftSubtitle}${draftEdited ? ' · unpublished changes' : ''}` :
                        entry.v.comment || <span className="text-slate-400">No release notes</span>}</p>
                      <p className="m-0 mt-1 text-[11px] text-slate-400">{dateLabel(isDraftRow ? draft!.updatedAt : entry.v.createdAt)}</p>
                    </button>
                  </li>
                );
              })}
              {!entries.length && <li className={empty}>{versions.length ? 'No versions match your search.' : 'No versions yet. Create the first one from the draft.'}</li>}
              {draft && !filtered.length && versions.length > 0 && q && <li className={empty}>No published versions match your search.</li>}
            </ul>
          </aside>

          {/* detail */}
          <section className="min-h-0 min-w-0 overflow-y-auto p-5 lg:p-6 scrollbar-thin-custom">
            {!isDraftSelected && !selectedVersion ? (
              <div className="flex h-full items-center justify-center text-[13px] text-slate-400">Select a version from the list.</div>
            ) : (
              <div className="grid w-full min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-5">
                  <div className={card}>
                    <div className="flex flex-wrap items-start gap-4 px-5 pb-4 pt-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="m-0 text-[20px] font-semibold tracking-tight text-slate-900">{isDraftSelected ? 'Draft' : versionName(selectedVersion!)}</h2>
                          {isDraftSelected
                            ? <span className={chip}>Working copy</span>
                            : <>{latest?.id === selectedVersion?.id && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-accent">Latest</span>}<span className={chip}>Read-only</span></>}
                        </div>
                        <p className="m-0 mt-1.5 text-[13px] text-slate-500">{selectedDate ? dateLabel(selectedDate) : ''}{isDraftSelected ? ` · ${draftSubtitle}` : ''}</p>
                      </div>
                      {selectedVersion && <button type="button" className={btnPrimary} onClick={() => viewOnCanvas(selectedVersion)}><EyeIcon /> View on canvas</button>}
                      {isDraftSelected && <button type="button" className={btnPrimary} onClick={openDraftInModeler}><PencilIcon /> Open draft in modeler</button>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-2.5">
                      {selectedVersion && <>
                        <button type="button" className={btn} onClick={() => onEditAsDraft(selectedVersion.id)}><PencilIcon /> {draft ? 'Restore as draft' : 'Edit as draft'}</button>
                        <button type="button" className={btn} onClick={() => compareWithPrevious(selectedVersion)}><CompareIcon /> Compare</button>
                        <button type="button" className={btn} onClick={() => downloadText(serializeToJson(selectedVersion.graph), `workflow-v${selectedVersion.version}${selectedVersion.versionTag ? `-${safeName(selectedVersion.versionTag)}` : ''}.json`)}><DownloadIcon /> Export JSON</button>
                        <button type="button" className={`${btnGhost} ml-auto hover:!bg-red-50 hover:!text-red-700`} onClick={() => deleteVersion(selectedVersion)}><TrashIcon /> Delete</button>
                      </>}
                      {isDraftSelected && <>
                        <span className="text-[12px] text-slate-500">{draftEdited ? 'Has changes that are not published yet.' : 'No unpublished changes.'}</span>
                        {draft && draft.basedOn !== null && versions.length > 0 && <button type="button" className={`${btnGhost} ml-auto hover:!bg-red-50 hover:!text-red-700`} onClick={discardDraft}><TrashIcon /> Discard draft</button>}
                      </>}
                    </div>
                  </div>

                  <section className={card + "h-[100%]"} aria-label="Diagram preview">
                    <DiagramPreview key={effSelected} graph={selectedGraph} />
                  </section>

                  {/* <section className={`${card} p-5`}>
                    <h3 className={cardTitle}>Release notes</h3>
                    <p className="m-0 mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-600">
                      {isDraftSelected ? (draftEdited ? 'The draft has changes that are not published yet Add release notes when you create the version' : 'No unpublished changes.')
                        : selectedVersion?.comment || <span className="text-slate-400">No release notes were added for this version.</span>}
                    </p>
                  </section> */}
                </div>

                <aside className="flex min-w-0 flex-col gap-5">
                  <section className={card}>
                    <header className="border-b border-slate-200 px-4 py-3"><h3 className={cardTitle}>Details</h3></header>
                    <dl className="m-0 divide-y divide-slate-100 px-4 text-[13px]">
                      {[
                        ['Status', isDraftSelected ? 'Draft' : 'Published'],
                        ['Version', isDraftSelected ? '—' : `v${selectedVersion!.version}`],
                        ['Tag', !isDraftSelected && selectedVersion?.versionTag ? selectedVersion.versionTag : '—'],
                        [isDraftSelected ? 'Last saved' : 'Created', selectedDate ? shortDate(selectedDate) : '—'],
                        ...(isDraftSelected ? [['Based on', draft?.basedOn ? `v${draft.basedOn}` : '—']] : []),
                        ['Elements', String(selectedGraph?.nodes.length ?? 0)],
                        ['Connections', String(selectedGraph?.edges.length ?? 0)],
                        ...(!isDraftSelected && selectedVersion ? [['Fingerprint', selectedVersion.checksum.slice(0, 8)]] : []),
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-500">{k}</dt><dd className={`m-0 max-w-[140px] truncate text-right font-medium text-slate-800 ${k === 'Fingerprint' ? 'font-mono text-[12px]' : ''}`} title={v}>{v}</dd></div>
                      ))}
                    </dl>
                  </section>
                  {breakdown.length > 0 && (
                    <section className={card}>
                      <header className="border-b border-slate-200 px-4 py-3"><h3 className={cardTitle}>Elements by type</h3></header>
                      <ul className="m-0 list-none divide-y divide-slate-100 p-0 px-4 text-[13px] !overflow-auto">
                        {breakdown.map(([name, count]) => <li key={name} className="flex items-center justify-between py-2.5"><span className="text-slate-600">{name}</span><span className="font-medium tabular-nums text-slate-800">{count}</span></li>)}
                      </ul>
                    </section>
                  )}
                </aside>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 gap-4 overflow-y-auto overflow-x-hidden p-5 lg:grid-cols-[minmax(0,70%)_minmax(0,30%)] lg:p-6">          <div className="flex flex-col gap-5 ">
          <div>
            <h2 className="m-0 text-[20px] font-semibold tracking-tight text-slate-900">Compare versions</h2>
            <p className="m-0 mt-1 text-[13px] text-slate-500">Pick any two entries they do not have to be next to each other</p>
          </div>

          <div className={`${card} p-4`}>
            <div className="flex items-end gap-3">
              <label className="block text-[12px] font-medium text-slate-600">Base
                <select value={effBase} onChange={(e) => setBaseId(e.target.value)} className={`${field} mt-1.5`}>
                  <option value="">Select a version…</option>
                  {newestFirst.map((v) => <option key={v.id} value={v.id}>{versionName(v)}</option>)}
                </select>
              </label>
              <button type="button" className={`${btn} !w-9 !px-0`} onClick={swapCompare} disabled={effTarget === 'draft' || !effBase} aria-label="Swap base and target" title={effTarget === 'draft' ? 'The draft can only be the target' : 'Swap'}>⇄</button>
              <label className="block text-[12px] font-medium text-slate-600">Compare with
                <select value={effTarget} onChange={(e) => setTargetId(e.target.value)} className={`${field} mt-1.5`}>
                  {draft && <option value="draft">Draft</option>}
                  {newestFirst.map((v) => <option key={v.id} value={v.id}>{versionName(v)}</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* {diff && (
              <div className="grid gap-3 sm:grid-cols-3">
                {([['Added', diff.added.length, '+'], ['Removed', diff.removed.length, '−'], ['Modified', diff.modified.length, '~']] as const).map(([label, count, glyph]) => (
                  <div key={label} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-[18px] font-semibold text-slate-600">{glyph}</span>
                    <div><p className="m-0 text-[24px] font-semibold leading-none tabular-nums text-slate-900">{count}</p><p className="m-0 mt-1 text-[12px] text-slate-500">{label}</p></div>
                  </div>
                ))}
              </div>
            )} */}

          {baseVersion && targetGraph && !sameEntry && (
            <div className="grid gap-5 xl:grid-cols-2">
              <section className={card} aria-label="Base preview">
                <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5"><h3 className={cardTitle}>{versionName(baseVersion)}</h3><span className={chip}>Base</span></header>
                <DiagramPreview key={`base-${baseVersion.id}`} graph={baseVersion.graph} heightClass="h-[320px]" />
              </section>
              <section className={card} aria-label="Target preview">
                <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5"><h3 className={cardTitle}>{targetVersion ? versionName(targetVersion) : 'Draft'}</h3><span className={chip}>Compared</span></header>
                <DiagramPreview key={`target-${effTarget}`} graph={targetGraph} heightClass="h-[320px]" />
              </section>
            </div>
          )}


        </div>
          <section className={"overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm"}>
            <header className="border-b border-slate-200 px-4 py-3"><h3 className={cardTitle}>Changes{diff ? ` · ${plural(diff.total, 'change')}` : ''}</h3></header>
            {!baseVersion ? <div className={empty}>Select a base version to see what changed</div>
              : sameEntry ? <div className={empty}>Choose two different entries to compare</div>
                : !diff ? <div className={empty}>There is nothing to compare with</div>
                  : diff.total === 0 ? <div className={`${empty} !text-slate-500`}>No differences between these two</div>
                    : <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                      {changed.map((c) => (
                        <li key={`${c.kind}-${c.id}`} className="flex items-start gap-3 px-4 py-3">
                          <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[13px] font-semibold ${c.kind === 'added' ? 'bg-emerald-50 text-emerald-700' : c.kind === 'removed' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`} aria-label={c.kind}>{c.kind === 'added' ? '+' : c.kind === 'removed' ? '−' : '~'}</span>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 text-[13px] font-medium text-slate-900">{c.label} <span className="font-normal text-slate-400">· {c.typeLabel}{c.isConnection ? ' (connection)' : ''}</span></p>
                            {c.details.map((d, i) => <p key={i} className="m-0 mt-0.5 text-[12px] text-slate-500">{d}</p>)}
                          </div>
                          <span className="text-[11px] capitalize text-slate-400">{c.kind}</span>
                        </li>
                      ))}
                    </ul>}
          </section>

        </section>
      )}
    </main>
  );
}
