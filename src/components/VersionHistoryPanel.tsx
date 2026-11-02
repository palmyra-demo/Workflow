import { useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon, CompareIcon, DownloadIcon, EyeIcon, HistoryIcon, LockIcon, PencilIcon, PublishIcon, TrashIcon } from './icons';
import type { Versioning } from '../workflow/versioning/useVersioning';
import { diffGraphs, parseHistory, WorkflowVersion } from '../workflow/versioning/versionStore';
import { serializeToJson } from '../workflow/io/json';

interface Props {
    versioning: Versioning;
    onClose: () => void;
    /** select + scroll to an element on the canvas */
    onFocusElement: (id: string) => void;
    /** shared with the canvas banner so both ask the same "replace your draft?" question */
    onEditAsDraft: (versionId: string) => void;
    notify: (message: string, level: 'error' | 'info') => void;
    /** bump to focus the publish comment box */
    focusToken?: number;
}

const ctl = '[font:inherit] box-border';
const btn = `${ctl} inline-flex h-7 cursor-pointer items-center gap-1.5 rounded border border-slate-200 bg-white px-2 text-[12px] text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`;
const btnPrimary = `${ctl} inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded border border-accent bg-accent px-3 text-[12px] font-medium text-white hover:bg-[#2753ad] disabled:cursor-not-allowed disabled:opacity-40`;
const field = `${ctl} w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-800 outline-none focus:border-accent`;
const badge = 'rounded px-1.5 py-px text-[10px] font-semibold uppercase';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const tagLabel = (v: WorkflowVersion) => `v${v.version}${v.versionTag ? ` · ${v.versionTag}` : ''}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function downloadText(content: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const KIND_STYLE = {
    added: { sign: '+', cls: 'bg-emerald-100 text-emerald-700' },
    removed: { sign: '−', cls: 'bg-red-100 text-red-700' },
    modified: { sign: '~', cls: 'bg-amber-100 text-amber-800' },
} as const;

export default function VersionHistoryPanel({ versioning, onClose, onFocusElement, onEditAsDraft, notify, focusToken }: Props) {
    const { versions, latest, draft, draftBase, draftEdited, canPublish, view, viewedVersion, readOnly, storageError, history } = versioning;

    const [comment, setComment] = useState('');
    const [tag, setTag] = useState('');
    const [compare, setCompare] = useState<{ baseId: string; targetId: string } | null>(null);
    const importRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (focusToken) document.getElementById('ver-comment')?.focus();
    }, [focusToken]);

    const newestFirst = useMemo(() => [...versions].reverse(), [versions]);

    const status = readOnly && viewedVersion
        ? `Viewing ${tagLabel(viewedVersion)} · published, read-only`
        : `Editing draft${draftBase ? ` · based on v${draftBase.version}` : draft?.basedOn ? ` · based on v${draft.basedOn}` : ''}`;

    // ---- compare ----------------------------------------------------------
    const compareBase = compare ? versions.find((v) => v.id === compare.baseId) ?? null : null;
    const targetGraph = compare
        ? compare.targetId === 'draft' ? draft?.graph ?? null : versions.find((v) => v.id === compare.targetId)?.graph ?? null
        : null;
    const diff = useMemo(
        () => (compareBase && targetGraph ? diffGraphs(compareBase.graph, targetGraph) : null),
        [compareBase, targetGraph],
    );
    const activeCompare = compare && compareBase && targetGraph ? compare : null;

    /**
     * Like Camunda: a version is compared with the one before it.
     * The first version has no predecessor, so it is compared with the draft, else with the next version.
     */
    const defaultCompare = (v: WorkflowVersion): { baseId: string; targetId: string } | null => {
        const i = versions.findIndex((x) => x.id === v.id);
        if (i > 0) return { baseId: versions[i - 1].id, targetId: v.id };
        if (draft) return { baseId: v.id, targetId: 'draft' };
        return versions[i + 1] ? { baseId: v.id, targetId: versions[i + 1].id } : null;
    };

    // ---- actions ----------------------------------------------------------
    const submit = () => {
        const result = versioning.publish({ comment, versionTag: tag });
        if (result.ok) {
            setComment('');
            setTag('');
            setCompare(null);
            notify(`Published v${result.version.version} – it is now read-only.`, 'info');
        } else {
            notify(result.reason, result.code === 'unchanged' ? 'info' : 'error');
        }
    };

    const onView = (v: WorkflowVersion) => {
        const r = versioning.openVersion(v.id);
        if (!r.ok) notify(r.reason, 'error');
    };

    const onOpenDraft = () => {
        const r = versioning.openDraft();
        if (!r.ok) notify(r.reason, 'error');
    };

    const onDiscard = () => {
        if (!confirm('Discard the draft and go back to the published version? Your draft changes will be lost.')) return;
        const r = versioning.discardDraft();
        if (!r.ok) notify(r.reason, 'error');
        else notify('Draft discarded.', 'info');
    };

    const onDelete = (v: WorkflowVersion) => {
        if (!confirm(`Delete ${tagLabel(v)} permanently? Published versions cannot be recovered.`)) return;
        versioning.deleteVersion(v.id);
        if (compare && (compare.baseId === v.id || compare.targetId === v.id)) setCompare(null);
    };

    const onImportFile = async (file: File) => {
        try {
            const incoming = parseHistory(await file.text());
            if ((versions.length || draft) && !confirm(
                `Replace the current history (${plural(versions.length, 'version')}${draft ? ' + draft' : ''}) with the imported one (${plural(incoming.versions.length, 'version')}${incoming.draft ? ' + draft' : ''})?`,
            )) return;
            versioning.replaceHistory(incoming);
            setCompare(null);
            notify(`Imported ${plural(incoming.versions.length, 'version')}.`, 'info');
        } catch (e) {
            notify(`Import failed: ${(e as Error).message}`, 'error');
        }
    };

    const exportOne = (v: WorkflowVersion) =>
        downloadText(serializeToJson(v.graph), `workflow-v${v.version}${v.versionTag ? `-${v.versionTag.replace(/[^\w.-]+/g, '_')}` : ''}.json`);

    const draftCompareBase = draftBase ?? latest;

    return (
        <aside
            role="dialog"
            aria-label="Version history"
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            className="absolute bottom-0 right-0 top-0 z-40 flex w-[380px] max-w-full flex-col border-l border-slate-300 bg-white text-[13px] text-slate-800 shadow-[-4px_0_16px_rgba(15,23,42,.12)]"
        >
            <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                <HistoryIcon className="h-4 w-4 text-slate-500" />
                <div className="min-w-0 flex-1">
                    <strong className="block text-sm text-slate-900">Version history</strong>
                    <span className="block truncate text-[11px] text-slate-500" data-testid="panel-status">{status}</span>
                </div>
                <button type="button" aria-label="Close version history" onClick={onClose}
                    className={`${ctl} flex h-8 w-8 cursor-pointer items-center justify-center rounded border-none bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900`}>
                    <CloseIcon className="h-4 w-4" />
                </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {/* draft */}
                <section className="border-b border-slate-200 px-4 py-3" aria-label="Draft">
                    {draft ? (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`${badge} bg-amber-100 text-amber-800`}>Draft</span>
                                {view.kind === 'draft' && <span className={`${badge} bg-accent text-white`}>Editing</span>}
                                <span className="text-[11px] text-slate-500">
                                    {draft.basedOn ? `Based on v${draft.basedOn}` : 'New diagram'}{draftEdited ? ' · edited' : ''}
                                </span>
                            </div>
                            <p className="m-0 mt-1 text-[11px] text-slate-500">
                                Autosaved {formatDate(draft.updatedAt)} · {plural(draft.graph.nodes.length, 'element')} · {plural(draft.graph.edges.length, 'connection')}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {view.kind !== 'draft' && (
                                    <button type="button" className={btn} onClick={onOpenDraft}><PencilIcon className="h-3.5 w-3.5" /> Back to draft</button>
                                )}
                                <button type="button" className={btn} disabled={!draftCompareBase}
                                    title={draftCompareBase ? `See what changed in the draft since v${draftCompareBase.version}` : 'Nothing published to compare with yet'}
                                    onClick={() => draftCompareBase && setCompare({ baseId: draftCompareBase.id, targetId: 'draft' })}>
                                    <CompareIcon className="h-3.5 w-3.5" /> Compare
                                </button>
                                <button type="button" className={`${btn} hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700`} disabled={!versions.length} onClick={onDiscard}
                                    title={versions.length ? 'Discard the draft' : 'Publish a version first'}>
                                    <TrashIcon className="h-3.5 w-3.5" /> Discard
                                </button>
                            </div>

                            <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2.5">
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500" htmlFor="ver-comment">
                                    Publish draft as v{history.nextVersion}
                                </label>
                                <textarea
                                    id="ver-comment"
                                    rows={2}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); } }}
                                    placeholder="What changed? (e.g. Added manager approval)"
                                    className={`${field} resize-none`}
                                />
                                <div className="mt-2 flex gap-2">
                                    <input
                                        value={tag}
                                        onChange={(e) => setTag(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                                        placeholder="Version tag (optional), e.g. 1.2.0"
                                        aria-label="Version tag"
                                        className={field}
                                    />
                                    <button type="button" onClick={submit} disabled={!canPublish} className={`${btnPrimary} shrink-0`}
                                        title={canPublish ? 'Publish (Ctrl+Enter in the comment box)' : `No changes since v${latest?.version}`}>
                                        <PublishIcon className="h-3.5 w-3.5" /> Publish
                                    </button>
                                </div>
                                <p className="m-0 mt-1.5 text-[11px] leading-snug text-slate-500">
                                    {canPublish
                                        ? 'Published versions are read-only. To change one later, use “Edit as draft”.'
                                        : `No changes since v${latest?.version}.`}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-start gap-2 text-[12px] text-slate-600">
                            <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                            <p className="m-0">
                                No draft. Published versions are read-only – use <strong>Edit as draft</strong> on a version below to make changes.
                            </p>
                        </div>
                    )}
                </section>

                {storageError && (
                    <p role="alert" className="m-0 border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-800">{storageError}</p>
                )}

                {/* compare */}
                {activeCompare && compareBase && (
                    <section className="border-b border-slate-200 bg-slate-50 px-4 py-3" aria-label="Compare versions">
                        <div className="flex items-center gap-2 text-[12px]">
                            <CompareIcon className="h-3.5 w-3.5 text-slate-500" />
                            <strong>{tagLabel(compareBase)}</strong>
                            <span className="text-slate-400">→</span>
                            <select
                                value={activeCompare.targetId}
                                onChange={(e) => setCompare({ ...activeCompare, targetId: e.target.value })}
                                aria-label="Compare with"
                                className={`${field} !w-auto min-w-0 flex-1 !py-1 !text-[12px]`}
                            >
                                {draft && <option value="draft">Draft</option>}
                                {newestFirst.filter((v) => v.id !== compareBase.id).map((v) => (
                                    <option key={v.id} value={v.id}>{tagLabel(v)}</option>
                                ))}
                            </select>
                            <button type="button" aria-label="Close comparison" onClick={() => setCompare(null)}
                                className={`${ctl} flex h-6 w-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-slate-500 hover:bg-slate-200`}>
                                <CloseIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {diff && (diff.total === 0
                            ? <p className="m-0 mt-2 text-[12px] text-slate-500">No differences.</p>
                            : (
                                <>
                                    <div className="mt-2 flex gap-1.5 text-[11px] font-medium">
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">+{diff.added.length} added</span>
                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">−{diff.removed.length} removed</span>
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">~{diff.modified.length} modified</span>
                                    </div>
                                    <ul className="m-0 mt-2 max-h-56 list-none divide-y divide-slate-200 overflow-y-auto rounded border border-slate-200 bg-white p-0">
                                        {[...diff.added, ...diff.removed, ...diff.modified].map((c) => {
                                            const style = KIND_STYLE[c.kind];
                                            const focusable = versioning.isOnCanvas(activeCompare.targetId) && c.kind !== 'removed';
                                            return (
                                                <li key={`${c.kind}:${c.id}`}>
                                                    <button type="button" disabled={!focusable} onClick={() => onFocusElement(c.id)}
                                                        title={focusable ? 'Show on canvas' : undefined}
                                                        className={`${ctl} flex w-full items-start gap-2 border-none bg-white px-2.5 py-1.5 text-left text-[12px] text-slate-700 enabled:cursor-pointer enabled:hover:bg-slate-50 disabled:cursor-default`}>
                                                        <span className={`mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[11px] font-bold ${style.cls}`}>{style.sign}</span>
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-medium text-slate-900">{c.label}</span>
                                                            <span className="block text-[11px] text-slate-500">
                                                                {c.typeLabel}{c.isConnection ? ' (connection)' : ''}
                                                                {c.details.map((d, i) => <span key={i} className="block">{d}</span>)}
                                                            </span>
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            ))}
                    </section>
                )}

                {/* published versions */}
                <h3 className="m-0 border-b border-slate-100 px-4 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Published versions
                </h3>
                {versions.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px] text-slate-500">
                        <p className="m-0 mb-1 text-slate-700">Nothing published yet.</p>
                        Publish your draft to create v1. Published versions can be viewed and compared, but not edited.
                    </div>
                ) : (
                    <ul className="m-0 list-none p-0">
                        {newestFirst.map((v) => {
                            const viewing = viewedVersion?.id === v.id;
                            const preset = defaultCompare(v);
                            return (
                                <li key={v.id} className={`border-b border-slate-100 px-4 py-3 ${viewing ? 'bg-[#f3f7ff]' : ''}`} data-version={v.version}>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="rounded bg-slate-800 px-1.5 py-px text-[11px] font-semibold text-white">v{v.version}</span>
                                        {v.versionTag && <span className="rounded border border-slate-300 px-1.5 py-px text-[11px] text-slate-700">{v.versionTag}</span>}
                                        <span className={`${badge} bg-emerald-100 text-emerald-700`}>Published</span>
                                        {viewing && <span className={`${badge} bg-accent text-white`}>Viewing</span>}
                                        {latest?.id === v.id && <span className={`${badge} bg-slate-100 text-slate-600`}>Latest</span>}
                                    </div>
                                    <p className={`m-0 mt-1.5 whitespace-pre-wrap break-words ${v.comment ? 'text-slate-800' : 'italic text-slate-400'}`}>{v.comment || 'No comment'}</p>
                                    <p className="m-0 mt-1 text-[11px] text-slate-500">
                                        {formatDate(v.createdAt)} · {plural(v.stats.nodes, 'element')} · {plural(v.stats.edges, 'connection')}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {!viewing && (
                                            <button type="button" className={btn} onClick={() => onView(v)} title="Open read-only on the canvas">
                                                <EyeIcon className="h-3.5 w-3.5" /> View
                                            </button>
                                        )}
                                        <button type="button" className={btn} onClick={() => onEditAsDraft(v.id)}
                                            title={draft ? 'Replace your current draft with this version' : 'Start an editable draft from this version'}>
                                            <PencilIcon className="h-3.5 w-3.5" /> {draft ? 'Restore as draft' : 'Edit as draft'}
                                        </button>
                                        <button type="button" className={btn} disabled={!preset}
                                            onClick={() => preset && setCompare(preset)}
                                            title={preset ? 'See what changed (compared with the previous version)' : 'Nothing to compare with yet'}>
                                            <CompareIcon className="h-3.5 w-3.5" /> Compare
                                        </button>
                                        <button type="button" className={btn} onClick={() => exportOne(v)} title="Download this version as workflow JSON">
                                            <DownloadIcon className="h-3.5 w-3.5" /> JSON
                                        </button>
                                        <button type="button" className={`${btn} hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700`} onClick={() => onDelete(v)} aria-label={`Delete ${tagLabel(v)}`} title="Delete version">
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <footer className="border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                <div className="flex gap-2">
                    {/* <button type="button" className={btn} disabled={!versions.length && !draft}
                        onClick={() => downloadText(versioning.exportHistory(), 'workflow-history.json')}>
                        <DownloadIcon className="h-3.5 w-3.5" /> Export history
                    </button>
                    <button type="button" className={btn} onClick={() => importRef.current?.click()}>
                        <UploadIcon className="h-3.5 w-3.5" /> Import history
                    </button> */}
                    <input ref={importRef} type="file" accept=".json,application/json" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); e.currentTarget.value = ''; }} />
                </div>
                <p className="m-0 mt-1.5 text-[11px] leading-snug text-slate-500">Draft and versions are stored in this browser. Export the history to back it up or move it elsewhere.</p>
            </footer>
        </aside>
    );
}
