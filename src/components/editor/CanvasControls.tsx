import { ReactNode } from 'react';
import type { WorkflowModeler } from '../../workflow/WorkflowModeler';
import type { Versioning } from '../../workflow/versioning/useVersioning';
import { FileMenu, FileMenuProps } from './FileMenu';
import { ICON_BUTTON, LABEL_BUTTON } from './styles';
import { FitIcon, HistoryIcon, LockIcon, RedoIcon, UndoIcon, ZoomInIcon, ZoomOutIcon } from '../icons';

const ZOOM_STEP = 1.15;

const Divider = () => <span className="workflow-control-divider" />;

interface IconButtonProps {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

const IconButton = ({ title, onClick, disabled, children }: IconButtonProps) => (
  <button className={ICON_BUTTON} title={title} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

interface CanvasControlsProps extends Omit<FileMenuProps, 'readOnly'> {
  modeler: WorkflowModeler;
  versioning: Versioning;
  versionsPageOpen: boolean;
  onOpenVersions: () => void;
}

export function CanvasControls({
  modeler,
  versioning,
  versionsPageOpen,
  onOpenVersions,
  ...fileMenu
}: CanvasControlsProps) {
  const { readOnly, viewedVersion } = versioning;
  const versionLabel = readOnly && viewedVersion ? `v${viewedVersion.version}` : 'Draft';

  return (
    <div className="workflow-canvas-controls" aria-label="Canvas controls">
      <IconButton title="Undo" onClick={() => modeler.undo()} disabled={readOnly || !modeler.canUndo()}>
        <UndoIcon />
      </IconButton>
      <IconButton title="Redo" onClick={() => modeler.redo()} disabled={readOnly || !modeler.canRedo()}>
        <RedoIcon />
      </IconButton>
      <Divider />
      <IconButton title="Zoom out" onClick={() => modeler.zoom(1 / ZOOM_STEP)}>
        <ZoomOutIcon />
      </IconButton>
      <IconButton title="Zoom in" onClick={() => modeler.zoom(ZOOM_STEP)}>
        <ZoomInIcon />
      </IconButton>
      <IconButton title="Fit diagram" onClick={() => modeler.fitViewport()}>
        <FitIcon />
      </IconButton>
      <Divider />
      <button
        className={`${LABEL_BUTTON} ${versionsPageOpen ? 'bg-[#e8f2ff] text-[#1668b2]' : ''}`}
        title="Version history"
        aria-pressed={versionsPageOpen}
        onClick={onOpenVersions}
      >
        {readOnly ? <LockIcon /> : <HistoryIcon />}
        <span className="text-[11px] font-medium">{versionLabel}</span>
      </button>
      <Divider />
      <FileMenu {...fileMenu} readOnly={readOnly} />
    </div>
  );
}
