import { CheckIcon, DownloadIcon, TrashIcon, UploadIcon } from '../icons';
import { ICON_BUTTON } from './styles';

export const READ_ONLY_MESSAGE = 'Published versions are read-only. Use “Edit as draft” to make changes.';

export interface FileMenuProps {
  open: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onImport: () => void;
  onExportXml: () => void;
  onExportJson: () => void;
  onValidate: () => void;
  onClear: () => void;
}

const DISABLED_STYLE = { opacity: 0.4, cursor: 'not-allowed' } as const;

export function FileMenu({
  open,
  readOnly,
  onToggle,
  onImport,
  onExportXml,
  onExportJson,
  onValidate,
  onClear,
}: FileMenuProps) {
  const lockedProps = {
    disabled: readOnly,
    style: readOnly ? DISABLED_STYLE : undefined,
    title: readOnly ? READ_ONLY_MESSAGE : undefined,
  };

  return (
    <div className="relative">
      <button className={ICON_BUTTON} title="File actions" onClick={onToggle}>
        <span className="text-lg leading-none">⋯</span>
      </button>
      {open && (
        <div className="workflow-file-menu">
          <button {...lockedProps} onClick={onImport}>
            <UploadIcon /> Import XML / JSON
          </button>
          <button onClick={onExportXml}>
            <DownloadIcon /> Export BPMN XML
          </button>
          <button onClick={onExportJson}>
            <DownloadIcon /> Export JSON
          </button>
          <button onClick={onValidate}>
            <CheckIcon /> Validate diagram
          </button>
          <div className="workflow-shortcut-hint">
            Shortcuts: Ctrl+Z Undo · Ctrl+Shift+Z Redo · Del Delete · Ctrl+S Export · Ctrl+O Import · 0 Fit
          </div>
          <button className="danger" {...lockedProps} onClick={onClear}>
            <TrashIcon /> Clear diagram
          </button>
        </div>
      )}
    </div>
  );
}
