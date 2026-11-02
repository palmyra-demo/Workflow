import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkflowModeler } from '../WorkflowModeler';
import {
  addVersion, draftIsEdited, graphChecksum, loadHistory, makeDraft, removeVersion, saveHistory,
  serializeHistory, VersionHistory, WorkflowDraft, WorkflowVersion,
} from './versionStore';

/** What is on the canvas: the editable draft, or one published (read-only) version. */
export type View = { kind: 'draft' } | { kind: 'version'; id: string };

export interface PublishOptions { comment?: string; versionTag?: string }
export type PublishResult =
  | { ok: true; version: WorkflowVersion }
  | { ok: false; code: 'unchanged' | 'error'; reason: string };
export type ActionResult = { ok: true } | { ok: false; code: 'exists' | 'error'; reason: string };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const OK: ActionResult = { ok: true };
const fail = (reason: string): ActionResult => ({ ok: false, code: 'error', reason });

/**
 * Draft → Publish → read-only version workflow, connected to a live WorkflowModeler.
 *
 *  - The draft is autosaved (debounced) while it is on the canvas.
 *  - Publishing freezes the draft into a numbered version and switches the canvas to that
 *    version in read-only mode.
 *  - "Edit as draft" is the only way back to editing.
 */
export function useVersioning(modeler: WorkflowModeler | null) {
  const [history, setHistory] = useState<VersionHistory>(() => loadHistory());
  const [view, setViewState] = useState<View>({ kind: 'draft' });
  const [storageError, setStorageError] = useState<string | null>(null);

  // Refs are written synchronously so back-to-back actions always see the latest data.
  const historyRef = useRef(history);
  const viewRef = useRef<View>(view);

  const persist = useCallback((next: VersionHistory) => {
    historyRef.current = next;
    setHistory(next);
    setStorageError(saveHistory(next));
  }, []);

  const setView = useCallback((next: View) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  /** Writes the canvas into the draft. No-op unless the draft is what is being edited. */
  const flushDraft = useCallback(() => {
    if (!modeler || modeler.isReadOnly() || viewRef.current.kind !== 'draft') return;
    const graph = modeler.getGraph();
    const checksum = graphChecksum(graph);
    const draft = historyRef.current.draft;
    if (draft && draft.checksum === checksum) return;
    persist({ ...historyRef.current, draft: makeDraft(graph, draft ? draft.basedOn : null, draft?.baseChecksum) });
  }, [modeler, persist]);

  const showVersion = useCallback((version: WorkflowVersion) => {
    if (!modeler) return;
    modeler.openGraph(clone(version.graph), true);
    setView({ kind: 'version', id: version.id });
  }, [modeler, setView]);

  const showDraft = useCallback((draft: WorkflowDraft) => {
    if (!modeler) return;
    modeler.openGraph(clone(draft.graph), false);
    setView({ kind: 'draft' });
    // importing can re-route connections slightly; re-baseline so an untouched draft stays "untouched"
    const graph = modeler.getGraph();
    const checksum = graphChecksum(graph);
    if (checksum !== draft.checksum) {
      const untouched = draft.checksum === draft.baseChecksum;
      persist({ ...historyRef.current, draft: { ...draft, graph, checksum, baseChecksum: untouched ? checksum : draft.baseChecksum } });
    }
  }, [modeler, persist, setView]);

  /** Decides what to show for a given history: draft > latest version > current canvas as first draft. */
  const bootstrap = useCallback((h: VersionHistory) => {
    if (!modeler) return;
    try {
      if (h.draft) showDraft(h.draft);
      else if (h.versions.length) showVersion(h.versions[h.versions.length - 1]);
      else {
        // first run: the sample on the canvas becomes the first draft
        modeler.setReadOnly(false);
        persist({ ...h, draft: makeDraft(modeler.getGraph(), null) });
        setView({ kind: 'draft' });
      }
    } catch (e) {
      console.error('[versions] could not open the saved diagram:', e);
    }
  }, [modeler, persist, setView, showDraft, showVersion]);

  // open the right thing on start
  useEffect(() => {
    if (modeler) bootstrap(historyRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeler]);

  // autosave the draft while it is being edited
  useEffect(() => {
    if (!modeler) return;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(flushDraft, 250);
    };
    const onHide = () => { window.clearTimeout(timer); flushDraft(); };
    const bus = modeler.get('eventBus');
    bus.on('commandStack.changed', schedule);
    bus.on('element.propertiesChanged', schedule);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearTimeout(timer);
      bus.off('commandStack.changed', schedule);
      bus.off('element.propertiesChanged', schedule);
      window.removeEventListener('pagehide', onHide);
    };
  }, [modeler, flushDraft]);

  // ------------------------------------------------------------------ actions

  /** Freezes the draft as the next version and shows it (read-only). */
  const publish = useCallback((opts: PublishOptions = {}): PublishResult => {
    if (!modeler) return { ok: false, code: 'error', reason: 'Editor is not ready yet.' };
    flushDraft();
    const h = historyRef.current;
    const draft = h.draft;
    if (!draft) return { ok: false, code: 'error', reason: 'There is no draft to publish.' };
    const latest = h.versions.length ? h.versions[h.versions.length - 1] : null;
    if (latest && draft.basedOn === latest.version && !draftIsEdited(draft)) {
      return { ok: false, code: 'unchanged', reason: `No changes since v${latest.version}.` };
    }
    const { history: next, version } = addVersion(h, draft.graph, opts);
    persist({ ...next, draft: null });
    try { showVersion(version); } catch (e) { console.error(e); }
    return { ok: true, version };
  }, [modeler, flushDraft, persist, showVersion]);

  /** Shows a published version, read-only. */
  const openVersion = useCallback((id: string): ActionResult => {
    const version = historyRef.current.versions.find((v) => v.id === id);
    if (!modeler || !version) return fail('Version not found.');
    flushDraft();
    try { showVersion(version); } catch (e) { return fail((e as Error).message); }
    return OK;
  }, [modeler, flushDraft, showVersion]);

  /** Goes back to the editable draft. */
  const openDraft = useCallback((): ActionResult => {
    const draft = historyRef.current.draft;
    if (!modeler || !draft) return fail('There is no draft.');
    if (viewRef.current.kind === 'draft') return OK;
    try { showDraft(draft); } catch (e) { return fail((e as Error).message); }
    return OK;
  }, [modeler, showDraft]);

  /**
   * Starts a draft from a published version. If an edited draft already exists the caller must
   * pass { replace: true } (after asking the user); otherwise code 'exists' is returned.
   */
  const editAsDraft = useCallback((id: string, opts: { replace?: boolean } = {}): ActionResult => {
    const version = historyRef.current.versions.find((v) => v.id === id);
    if (!modeler || !version) return fail('Version not found.');
    flushDraft();
    const existing = historyRef.current.draft;
    if (existing) {
      const edited = draftIsEdited(existing);
      if (!edited && existing.basedOn === version.version) {
        try { showDraft(existing); } catch (e) { return fail((e as Error).message); }
        return OK; // untouched draft of this very version – just open it
      }
      if (edited && !opts.replace) {
        return { ok: false, code: 'exists', reason: `You already have a draft${existing.basedOn ? ` (based on v${existing.basedOn})` : ''} with changes.` };
      }
    }
    try {
      modeler.openGraph(clone(version.graph), false);
      setView({ kind: 'draft' });
      persist({ ...historyRef.current, draft: makeDraft(modeler.getGraph(), version.version) });
    } catch (e) {
      return fail((e as Error).message);
    }
    return OK;
  }, [modeler, flushDraft, persist, setView, showDraft]);

  /** Throws the draft away and returns to the version it was based on. */
  const discardDraft = useCallback((): ActionResult => {
    const h = historyRef.current;
    const draft = h.draft;
    if (!modeler || !draft) return OK;
    const target = h.versions.find((v) => v.version === draft.basedOn) ?? (h.versions.length ? h.versions[h.versions.length - 1] : null);
    if (!target) return fail('Nothing to go back to – publish a version first.');
    persist({ ...h, draft: null });
    try { showVersion(target); } catch (e) { return fail((e as Error).message); }
    return OK;
  }, [modeler, persist, showVersion]);

  const deleteVersion = useCallback((id: string) => {
    const next = removeVersion(historyRef.current, id);
    persist(next);
    const current = viewRef.current;
    if (!modeler || current.kind !== 'version' || current.id !== id) return;
    // the version on screen is gone – fall back to the draft, the newest version, or a fresh draft
    try {
      if (next.draft) showDraft(next.draft);
      else if (next.versions.length) showVersion(next.versions[next.versions.length - 1]);
      else {
        modeler.setReadOnly(false);
        persist({ ...next, draft: makeDraft(modeler.getGraph(), null) });
        setView({ kind: 'draft' });
      }
    } catch (e) {
      console.error(e);
    }
  }, [modeler, persist, setView, showDraft, showVersion]);

  /** Swaps in a history parsed from a file (see parseHistory) and opens it. */
  const replaceHistory = useCallback((next: VersionHistory) => {
    persist(next);
    bootstrap(next);
  }, [persist, bootstrap]);

  const exportHistory = useCallback(() => {
    flushDraft();
    return serializeHistory(historyRef.current);
  }, [flushDraft]);

  // ------------------------------------------------------------------ derived

  const versions = history.versions;
  const latest = versions.length ? versions[versions.length - 1] : null;
  const draft = history.draft;
  const readOnly = view.kind === 'version';
  const viewedVersion = view.kind === 'version' ? versions.find((v) => v.id === view.id) ?? null : null;
  const draftBase = draft && draft.basedOn !== null ? versions.find((v) => v.version === draft.basedOn) ?? null : null;
  const draftEdited = draft ? draftIsEdited(draft) : false;

  return {
    history,
    versions,
    latest,
    draft,
    draftBase,
    draftEdited,
    /** publishing would produce something new */
    canPublish: !!draft && (!latest || draftEdited || draft.basedOn !== latest.version),
    view,
    readOnly,
    viewedVersion,
    /** is this compare target (a version id, or 'draft') what is currently on the canvas? */
    isOnCanvas: (target: string) => (target === 'draft' ? view.kind === 'draft' : view.kind === 'version' && view.id === target),
    storageError,
    publish,
    openVersion,
    openDraft,
    editAsDraft,
    discardDraft,
    deleteVersion,
    replaceHistory,
    exportHistory,
  };
}

export type Versioning = ReturnType<typeof useVersioning>;
