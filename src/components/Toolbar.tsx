import { ReactNode, useEffect, useRef, useState } from 'react';
import { WorkflowModeler } from '../workflow/WorkflowModeler';
import {
  CheckIcon, DownloadIcon, FitIcon, FlowIcon, RedoIcon, SparkIcon, TrashIcon, UndoIcon, UploadIcon, ZoomInIcon, ZoomOutIcon,
} from './icons';

interface Props {
  modeler: WorkflowModeler | null;
  onValidate: () => void;
}

const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40';

function IconButton({ title, onClick, disabled, children }: { title: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`${base} h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:hover:bg-transparent`}>
      {children}
    </button>
  );
}

function TextButton({ title, onClick, children, tone = 'default' }: { title?: string; onClick: () => void; children: ReactNode; tone?: 'default' | 'primary' | 'danger' }) {
  const tones = {
    default: 'border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
    primary: 'bg-accent px-3 text-white shadow-sm hover:bg-[#2753ad]',
    danger: 'border border-transparent px-3 text-slate-600 hover:bg-red-50 hover:text-red-600',
  };
  return <button type="button" title={title} onClick={onClick} className={`${base} h-8 ${tones[tone]}`}>{children}</button>;
}

const Divider = () => <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />;

export default function Toolbar({ modeler, onValidate }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!modeler) return;
    const eventBus = modeler.get('eventBus');
    const rerender = () => forceRender((n) => n + 1);
    eventBus.on('commandStack.changed', rerender);
    return () => eventBus.off('commandStack.changed', rerender);
  }, [modeler]);

  const download = (content: string, filename: string, mime: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    if (!modeler) return;
    const text = await file.text();
    try {
      if (file.name.endsWith('.json')) modeler.importJson(text);
      else modeler.importXml(text);
      modeler.fitViewport();
    } catch (err) {
      alert('Import failed: ' + (err as Error).message);
    }
  };

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <div className="mr-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm"><FlowIcon className="h-[18px] w-[18px]" /></span>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-slate-900">Workflow Editor</div>
          <div className="text-[11px] text-slate-400">BPMN-style modeler</div>
        </div>
      </div>

      {modeler && (
        <>
          <Divider />
          <IconButton title="Undo (Ctrl+Z)" onClick={() => modeler.undo()} disabled={!modeler.canUndo()}><UndoIcon /></IconButton>
          <IconButton title="Redo (Ctrl+Shift+Z)" onClick={() => modeler.redo()} disabled={!modeler.canRedo()}><RedoIcon /></IconButton>
          <Divider />
          <IconButton title="Zoom out" onClick={() => modeler.zoom(1 / 1.15)}><ZoomOutIcon /></IconButton>
          <IconButton title="Zoom in" onClick={() => modeler.zoom(1.15)}><ZoomInIcon /></IconButton>
          <IconButton title="Fit diagram to screen" onClick={() => modeler.fitViewport()}><FitIcon /></IconButton>

          <div className="flex-1" />

          <TextButton title="Load an example diagram" onClick={() => modeler.loadSample()}><SparkIcon /> Sample</TextButton>
          <TextButton title="Import XML or JSON" onClick={() => fileInputRef.current?.click()}><UploadIcon /> Import</TextButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.json,.bpmn"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = '';
            }}
          />
          <TextButton title="Export as BPMN XML" onClick={() => { try { download(modeler.exportXml(), 'workflow.xml', 'application/xml'); } catch (err) { alert((err as Error).message); } }}>
            <DownloadIcon /> XML
          </TextButton>
          <TextButton title="Export as JSON" onClick={() => download(modeler.exportJson(), 'workflow.json', 'application/json')}>
            <DownloadIcon /> JSON
          </TextButton>
          <Divider />
          <TextButton tone="danger" title="Remove everything from the canvas" onClick={() => { if (confirm('Clear the whole diagram?')) modeler.clear(); }}><TrashIcon /> Clear</TextButton>
          <TextButton tone="primary" title="Check the diagram for problems" onClick={onValidate}><CheckIcon /> Validate</TextButton>
        </>
      )}
    </header>
  );
}
