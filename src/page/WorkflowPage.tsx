import { Fragment, useEffect, useRef, useState } from 'react';
import { ValidationIssue } from '../workflow/validation';
import { Editor } from '../components/Editor';
import PropertiesPanel from '../components/PropertiesPanel';
import { AlertIcon, CheckIcon, CloseIcon, DownloadIcon, FitIcon, HistoryIcon, LockIcon, PencilIcon, PublishIcon, RedoIcon, TrashIcon, UndoIcon, UploadIcon, ZoomInIcon, ZoomOutIcon } from '../components/icons';
import VersionHistoryPage from '../components/VersionHistoryPage';
import { useVersioning } from '../workflow/versioning/useVersioning';

const READ_ONLY_MESSAGE = 'Published versions are read-only. Use “Edit as draft” to make changes.';

const WorkflowPage = () => {
    const [modeler, setModeler] = useState<any>(null);
    const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
    const [selection, setSelection] = useState<any[]>([]);

    const [toast, setToast] = useState<{ message: string; level: string } | null>(null);
    const [fileMenuOpen, setFileMenuOpen] = useState(false);
    const [versionsPageOpen, setVersionsPageOpen] = useState(false);
    const [openWithPublish, setOpenWithPublish] = useState(false);
    // path of the collapsed sub-process that is open (empty = the whole process is shown)
    const [crumbs, setCrumbs] = useState<Array<{ id: string | null; name: string }>>([]);
    useEffect(() => {
        if (!modeler) return;
        const bus = modeler.get('eventBus');
        const onDrill = (e: any) => setCrumbs(e.path.length > 1 ? e.path : []);
        bus.on('workflow.drill.changed', onDrill);
        return () => bus.off('workflow.drill.changed', onDrill);
    }, [modeler]);
    const versioning = useVersioning(modeler);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast]);

    const selected = selection.length === 1 ? selection[0] : null;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!modeler || versionsPageOpen) return;
            if (event.defaultPrevented) return;
            const target = event.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            const editing = !!target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
            const inUi = !!target?.closest?.('.bpp, [role="dialog"], [role="listbox"], [role="menu"]');
            if (editing || inUi) {
                if (event.key === 'Escape' && editing) (target as HTMLElement).blur();
                return;
            }
            const mod = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();
            const ro = modeler.isReadOnly();
            if (mod && key === 'z') {
                event.preventDefault();
                if (ro) return;
                if (event.shiftKey) { if (modeler.canRedo()) modeler.redo(); }
                else if (modeler.canUndo()) modeler.undo();
            } else if (mod && key === 'y') {
                event.preventDefault();
                if (!ro && modeler.canRedo()) modeler.redo();
            } else if (mod && key === 's') {
                event.preventDefault();
                try { download(modeler.exportXml(), 'workflow.bpmn', 'application/xml'); }
                catch (e) { setToast({ message: (e as Error).message, level: 'error' }); }
            } else if (mod && key === 'o') {
                event.preventDefault();
                if (ro) { setToast({ message: READ_ONLY_MESSAGE, level: 'info' }); return; }
                fileInputRef.current?.click();
            } else if (mod && key === 'a') {
                event.preventDefault();
                const all = modeler.get('elementRegistry').getAll().filter((el: any) => el.type?.startsWith('workflow:') && !el.hidden);
                modeler.get('selection').select(all);
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                const selectionService = modeler.get('selection');
                const current = selectionService.get();
                if (current?.length && !ro) {
                    event.preventDefault();
                    modeler.get('modeling').removeElements(current.slice());
                    selectionService.select([]);
                }
            } else if (event.key === 'Escape') {
                setFileMenuOpen(false);
                setIssues(null);
                modeler.get('selection').select([]);
            } else if (event.key === '+' || event.key === '=') {
                modeler.zoom(1.15);
            } else if (event.key === '-') {
                modeler.zoom(1 / 1.15);
            } else if (event.key === '0' && !mod) {
                event.preventDefault();
                modeler.fitViewport();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [modeler, selection, versionsPageOpen]);

    const handleValidate = () => {
        if (!modeler) return;
        setIssues(modeler.validate());
    };

    const focusIssue = (elementId?: string) => {
        if (!modeler || !elementId) return;
        const registry = modeler.get('elementRegistry');
        const element = registry.get(elementId);
        if (element) {
            modeler.get('selection').select(element);
            const canvas = modeler.get('canvas');
            if (typeof canvas.scrollToElement === 'function') {
                canvas.scrollToElement(element);
            }
        }
    };

    const errors = issues?.filter((i) => i.level === 'error').length ?? 0;
    const warnings = issues?.filter((i) => i.level === 'warning').length ?? 0;

    const download = (content: string, filename: string, mime: string) => { const url = URL.createObjectURL(new Blob([content], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };
    const importFile = async (file: File) => { if (!modeler) return; if (modeler.isReadOnly()) { setToast({ message: READ_ONLY_MESSAGE, level: 'info' }); return; } try { const content = await file.text(); file.name.endsWith('.json') ? modeler.importJson(content) : modeler.importXml(content); modeler.fitViewport(); } catch (e) { setToast({ message: `Import failed: ${(e as Error).message}`, level: 'error' }); } };
    const editAsDraft = (versionId: string): boolean => {
        let result = versioning.editAsDraft(versionId);
        if (!result.ok && result.code === 'exists') {
            const version = versioning.versions.find((v) => v.id === versionId);
            if (!confirm(`${result.reason}\n\nRestoring v${version?.version} as your draft replaces it, and those changes will be lost.\nTo keep working on your draft instead, choose “Back to draft”.\n\nReplace the draft with v${version?.version}?`)) return false;
            result = versioning.editAsDraft(versionId, { replace: true });
        }
        if (!result.ok) { setToast({ message: result.reason, level: 'error' }); return false; }
        return true;
    };
    const backToDraft = () => {
        const result = versioning.openDraft();
        if (!result.ok) setToast({ message: result.reason, level: 'error' });
    };
    const openPublish = () => { setOpenWithPublish(true); setVersionsPageOpen(true); };
    const openVersions = () => { setOpenWithPublish(false); setVersionsPageOpen(true); };
    const controlClass = 'flex h-8 w-8 items-center justify-center border-none cursor-pointer rounded-sm text-[#333] hover:bg-[#e8f2ff] hover:text-[#1668b2] disabled:opacity-35';

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-white text-slate-800">
            <div className="flex min-h-0 min-w-0 flex-1 border-t border-gray-200">
                <Editor
                    onReady={setModeler}
                    onSelectionChange={setSelection}
                    onChange={() => setIssues(null)}
                    onFeedback={(message, level) => setToast({ message, level })}
                />
                <PropertiesPanel modeler={modeler} element={selected} selectionCount={selection.length} readOnly={versioning.readOnly} />
            </div>

            {modeler && <div className="workflow-canvas-controls" aria-label="Canvas controls">
                <button className={controlClass} title="Undo" onClick={() => modeler.undo()} disabled={versioning.readOnly || !modeler.canUndo()}><UndoIcon /></button>
                <button className={controlClass} title="Redo" onClick={() => modeler.redo()} disabled={versioning.readOnly || !modeler.canRedo()}><RedoIcon /></button>
                <span className="workflow-control-divider" />
                <button className={controlClass} title="Zoom out" onClick={() => modeler.zoom(1 / 1.15)}><ZoomOutIcon /></button>
                <button className={controlClass} title="Zoom in" onClick={() => modeler.zoom(1.15)}><ZoomInIcon /></button>
                <button className={controlClass} title="Fit diagram" onClick={() => modeler.fitViewport()}><FitIcon /></button>
                <span className="workflow-control-divider" />
                <button
                    className={`${controlClass.replace('w-8', 'px-2 gap-1.5')} ${versionsPageOpen ? 'bg-[#e8f2ff] text-[#1668b2]' : ''}`}
                    title="Version history"
                    aria-pressed={versionsPageOpen}
                    onClick={openVersions}
                >
                    {versioning.readOnly ? <LockIcon /> : <HistoryIcon />}
                    <span className="text-[11px] font-medium">{versioning.readOnly && versioning.viewedVersion ? `v${versioning.viewedVersion.version}` : 'Draft'}</span>
                </button>
                <span className="workflow-control-divider" />
                <div className="relative">
                    <button className={controlClass} title="File actions" onClick={() => setFileMenuOpen(v => !v)}><span className="text-lg leading-none">⋯</span></button>
                    {fileMenuOpen && <div className="workflow-file-menu">
                        <button disabled={versioning.readOnly} style={versioning.readOnly ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} title={versioning.readOnly ? READ_ONLY_MESSAGE : undefined} onClick={() => { setFileMenuOpen(false); fileInputRef.current?.click(); }} ><UploadIcon /> Import XML / JSON</button>
                        <button onClick={() => { setFileMenuOpen(false); try { download(modeler.exportXml(), 'workflow.bpmn', 'application/xml'); } catch (e) { setToast({ message: (e as Error).message, level: 'error' }); } }}><DownloadIcon /> Export BPMN XML</button>
                        <button onClick={() => { setFileMenuOpen(false); download(modeler.exportJson(), 'workflow.json', 'application/json'); }}><DownloadIcon /> Export JSON</button>
                        <button onClick={() => { setFileMenuOpen(false); handleValidate(); }}><CheckIcon /> Validate diagram</button>
                        <div className="workflow-shortcut-hint">Shortcuts: Ctrl+Z Undo · Ctrl+Shift+Z Redo · Del Delete · Ctrl+S Export · Ctrl+O Import · 0 Fit</div>
                        <button className="danger" disabled={versioning.readOnly} style={versioning.readOnly ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} title={versioning.readOnly ? READ_ONLY_MESSAGE : undefined} onClick={() => { setFileMenuOpen(false); if (confirm('Clear the whole diagram?')) modeler.clear(); }}><TrashIcon /> Clear diagram</button>
                    </div>}
                    <input ref={fileInputRef} type="file" accept=".xml,.json,.bpmn" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void importFile(f); e.currentTarget.value = ''; }} />
                </div>
            </div>}

            {modeler && crumbs.length > 1 && (
                <nav aria-label="Sub-process path" data-testid="drill-breadcrumb"
                    className="absolute left-[72px] top-3 z-30 flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[12px] shadow-md">
                    {crumbs.map((c, i) => (
                        <Fragment key={c.id ?? 'root'}>
                            {i > 0 && <span className="text-slate-400">›</span>}
                            {i < crumbs.length - 1
                                ? <button type="button" onClick={() => modeler.get('subProcessView').goTo(c.id)}
                                    className="cursor-pointer border-none bg-transparent p-0 text-accent [font:inherit] hover:underline">{c.name}</button>
                                : <strong className="text-slate-900">{c.name}</strong>}
                        </Fragment>
                    ))}
                </nav>
            )}

            {modeler && (
                <div
                    data-testid="mode-pill"
                    className={`absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-white py-1 pl-3 pr-1.5 text-[12px] shadow-md ${versioning.readOnly ? 'border-slate-300' : 'border-amber-200'}`}
                >
                    {versioning.readOnly && versioning.viewedVersion ? (
                        <>
                            <LockIcon className="h-3.5 w-3.5 text-slate-500" />
                            <strong className="text-slate-900">v{versioning.viewedVersion.version}{versioning.viewedVersion.versionTag ? ` · ${versioning.viewedVersion.versionTag}` : ''}</strong>
                            <span className="text-slate-500">Published · read-only</span>
                            {versioning.draft ? (
                                <>
                                    <button type="button" onClick={backToDraft}
                                        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border-none bg-accent px-3 text-[12px] font-medium text-white [font:inherit] hover:bg-[#2753ad]">
                                        <PencilIcon className="h-3.5 w-3.5" /> Back to draft
                                    </button>
                                    <button type="button" onClick={() => editAsDraft(versioning.viewedVersion!.id)}
                                        title="Replace your current draft with this version"
                                        className="inline-flex h-7 cursor-pointer items-center rounded-full border border-slate-300 bg-white px-3 text-[12px] text-slate-700 [font:inherit] hover:bg-slate-50">
                                        Restore as draft
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={() => editAsDraft(versioning.viewedVersion!.id)}
                                    className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border-none bg-accent px-3 text-[12px] font-medium text-white [font:inherit] hover:bg-[#2753ad]">
                                    <PencilIcon className="h-3.5 w-3.5" /> Edit as draft
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-semibold uppercase text-amber-800">Draft</span>
                            <span className="text-slate-500">
                                {versioning.draftBase ? `Based on v${versioning.draftBase.version}` : versioning.draft?.basedOn ? `Based on v${versioning.draft.basedOn}` : 'Not published yet'} · autosaved
                            </span>
                            <button type="button" onClick={openPublish}
                                className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border-none bg-accent px-3 text-[12px] font-medium text-white [font:inherit] hover:bg-[#2753ad]">
                                <PublishIcon className="h-3.5 w-3.5" /> Publish
                            </button>
                        </>
                    )}
                </div>
            )}

            {versionsPageOpen && <VersionHistoryPage
                versioning={versioning}
                onBack={() => setVersionsPageOpen(false)}
                onEditAsDraft={(versionId) => { if (editAsDraft(versionId)) setVersionsPageOpen(false); }}
                startWithPublish={openWithPublish}
                notify={(message, level) => setToast({ message, level })}
            />}

            {toast && (
                <div
                    role="alert"
                    onClick={() => setToast(null)}
                    className={`fixed bottom-6 left-1/2 z-[200] flex max-w-[min(560px,90vw)] -translate-x-1/2 cursor-pointer animate-slide-up items-start gap-2.5 rounded-sm border px-4 py-3 text-[13px] shadow-lg ${toast.level === 'info' ? 'border-[#393939] bg-[#393939] text-white' : 'border-[#da1e28] bg-white text-[#a2191f]'
                        }`}
                >
                    <AlertIcon className="mt-px h-4 w-4 shrink-0" />
                    <span>{toast.message}</span>
                </div>
            )}

            {issues && (
                <section className="fixed bottom-6 left-1/2 z-40 flex max-h-[42vh] w-[min(720px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                    <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-2 justify-center">
                        <strong className="text-sm text-slate-900">Validation</strong>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${issues.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {issues.length === 0 ? 'No issues' : `${errors} error${errors === 1 ? '' : 's'} · ${warnings} warning${warnings === 1 ? '' : 's'}`}
                        </span>
                        <button type="button" onClick={() => setIssues(null)} aria-label="Close validation"
                            className="ml-auto border-none p-1 text-slate-500 hover:bg-slate-100 hover:rounded-full w-10 flex items-center justify-center
                             h-10 bg-white hover:text-slate-900 cursor-pointer">
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </header>
                    {issues.length > 0 && (
                        <ul className="m-0 list-none divide-y divide-slate-100 overflow-y-auto p-0">
                            {issues.map((issue, i) => (
                                <li key={i}>
                                    <button type="button" onClick={() => focusIssue(issue.elementId)}
                                        className="flex w-full border border-gray-100/20 items-start gap-3 px-4 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50">
                                        <span className={`mt-px rounded px-1.5 py-px text-[10px] font-semibold uppercase ${issue.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{issue.level}</span>
                                        <span>{issue.message}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </div>
    );
}

export { WorkflowPage }