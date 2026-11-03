import { CSSProperties, useEffect, useRef, useState } from 'react';
import { CanvasControls } from './components/editor/CanvasControls';
import { Crumb, DrillBreadcrumb } from './components/editor/DrillBreadcrumb';
import { READ_ONLY_MESSAGE } from './components/editor/FileMenu';
import { ModePill } from './components/editor/ModePill';
import { Toast } from './components/editor/Toast';
import { ValidationPanel } from './components/editor/ValidationPanel';
import { Editor } from './components/Editor';
import PropertiesPanel from './components/PropertiesPanel';
import VersionHistoryPage from './components/versions/VersionHistoryPage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import { useVersionActions } from './hooks/useVersionActions';
import { downloadFile, errorMessage } from './utils/download';
import { InitialDiagram, resolveInitialDiagram } from './utils/initialDiagram';
import type { WorkflowModeler } from './workflow/WorkflowModeler';
import { useVersioning } from './workflow/versioning/useVersioning';
import type { ValidationIssue } from './workflow/validation';

export interface WorkflowEditorProps {
  className?: string;
  style?: CSSProperties;
  initialDiagram?: InitialDiagram | null;
  storageKey?: string;
  onReady?: (modeler: WorkflowModeler) => void;
}

export function WorkflowEditor({
  className,
  style,
  initialDiagram,
  storageKey,
  onReady,
}: WorkflowEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [modeler, setModeler] = useState<WorkflowModeler | null>(null);
  const [selection, setSelection] = useState<any[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [versionsPageOpen, setVersionsPageOpen] = useState(false);
  const [openWithPublish, setOpenWithPublish] = useState(false);

  const { toast, notify, dismiss } = useToast();
  const versioning = useVersioning(modeler, { storageKey });
  const { editAsDraft, backToDraft } = useVersionActions(versioning, notify);

  const [initial] = useState(() => resolveInitialDiagram(initialDiagram));
  useEffect(() => {
    if (initial.error) notify(initial.error, 'error');
  }, [initial.error, notify]);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    if (modeler) onReadyRef.current?.(modeler);
  }, [modeler]);

  useEffect(() => {
    if (!modeler) return;
    const eventBus = modeler.get('eventBus');
    const onDrillChanged = (event: { path: Crumb[] }) => setCrumbs(event.path.length > 1 ? event.path : []);
    eventBus.on('workflow.drill.changed', onDrillChanged);
    return () => eventBus.off('workflow.drill.changed', onDrillChanged);
  }, [modeler]);

  const selected = selection.length === 1 ? selection[0] : null;

  const exportXml = () => {
    if (!modeler) return;
    try {
      downloadFile(modeler.exportXml(), 'workflow.bpmn', 'application/xml');
    } catch (error) {
      notify(errorMessage(error), 'error');
    }
  };

  const exportJson = () => {
    if (modeler) downloadFile(modeler.exportJson(), 'workflow.json', 'application/json');
  };

  const requestImport = () => {
    if (modeler?.isReadOnly()) {
      notify(READ_ONLY_MESSAGE, 'info');
      return;
    }
    fileInputRef.current?.click();
  };

  const importFile = async (file: File) => {
    if (!modeler) return;
    if (modeler.isReadOnly()) {
      notify(READ_ONLY_MESSAGE, 'info');
      return;
    }
    try {
      const content = await file.text();
      if (file.name.endsWith('.json')) modeler.importJson(content);
      else modeler.importXml(content);
      modeler.fitViewport();
    } catch (error) {
      notify(`Import failed: ${errorMessage(error)}`, 'error');
    }
  };

  const clearDiagram = () => {
    if (modeler && confirm('Clear the whole diagram?')) modeler.clear();
  };

  const selectIssue = (elementId?: string) => {
    if (!modeler || !elementId) return;
    const element = modeler.get('elementRegistry').get(elementId);
    if (!element) return;
    modeler.get('selection').select(element);
    const canvas = modeler.get('canvas');
    if (typeof canvas.scrollToElement === 'function') canvas.scrollToElement(element);
  };

  useKeyboardShortcuts(modeler, rootRef, versionsPageOpen, {
    onSave: exportXml,
    onOpen: requestImport,
    onEscape: () => {
      setFileMenuOpen(false);
      setIssues(null);
    },
  });

  const fromMenu = (action: () => void) => () => {
    setFileMenuOpen(false);
    action();
  };

  const openVersions = (withPublish: boolean) => {
    setOpenWithPublish(withPublish);
    setVersionsPageOpen(true);
  };

  return (
    <div
      ref={rootRef}
      style={style}
      className={`workflow-editor relative flex h-full flex-col overflow-hidden bg-white text-slate-800 ${className ?? ''}`}
    >
      <div className="flex min-h-0 min-w-0 flex-1 border-t border-gray-200">
        <Editor
          initialGraph={initial.graph}
          onReady={setModeler}
          onSelectionChange={setSelection}
          onChange={() => setIssues(null)}
          onFeedback={notify}
        />
        <PropertiesPanel
          modeler={modeler}
          element={selected}
          selectionCount={selection.length}
          readOnly={versioning.readOnly}
        />
      </div>

      {modeler && (
        <>
          <CanvasControls
            modeler={modeler}
            versioning={versioning}
            versionsPageOpen={versionsPageOpen}
            onOpenVersions={() => openVersions(false)}
            open={fileMenuOpen}
            onToggle={() => setFileMenuOpen((open) => !open)}
            onImport={fromMenu(requestImport)}
            onExportXml={fromMenu(exportXml)}
            onExportJson={fromMenu(exportJson)}
            onValidate={fromMenu(() => setIssues(modeler.validate()))}
            onClear={fromMenu(clearDiagram)}
          />
          <DrillBreadcrumb crumbs={crumbs} modeler={modeler} />
          <ModePill
            versioning={versioning}
            onBackToDraft={backToDraft}
            onEditAsDraft={editAsDraft}
            onPublish={() => openVersions(true)}
          />
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,.json,.bpmn"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
          event.currentTarget.value = '';
        }}
      />

      {versionsPageOpen && (
        <VersionHistoryPage
          versioning={versioning}
          onBack={() => setVersionsPageOpen(false)}
          onEditAsDraft={(versionId) => {
            if (editAsDraft(versionId)) setVersionsPageOpen(false);
          }}
          startWithPublish={openWithPublish}
          notify={notify}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={dismiss} />}
      {issues && (
        <ValidationPanel issues={issues} onClose={() => setIssues(null)} onSelectIssue={selectIssue} />
      )}
    </div>
  );
}
