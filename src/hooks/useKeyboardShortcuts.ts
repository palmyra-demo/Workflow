import { RefObject, useEffect, useRef } from 'react';
import type { WorkflowModeler } from '../workflow/WorkflowModeler';

const ZOOM_STEP = 1.15;
const TEXT_INPUT_TAGS = ['input', 'textarea', 'select'];
const UI_SELECTOR = '.bpp, [role="dialog"], [role="listbox"], [role="menu"]';

export interface ShortcutHandlers {
  onSave: () => void;
  onOpen: () => void;
  onEscape: () => void;
}

export function useKeyboardShortcuts(
  modeler: WorkflowModeler | null,
  rootRef: RefObject<HTMLElement | null>,
  disabled: boolean,
  handlers: ShortcutHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!modeler || disabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement | null;
      const belongsToEditor = target === document.body || !!rootRef.current?.contains(target);
      if (!belongsToEditor) return;

      const isTextInput =
        !!target?.isContentEditable || TEXT_INPUT_TAGS.includes(target?.tagName?.toLowerCase() ?? '');
      const isInsidePanelOrDialog = !!target?.closest?.(UI_SELECTOR);
      if (isTextInput || isInsidePanelOrDialog) {
        if (event.key === 'Escape' && isTextInput) target?.blur();
        return;
      }

      const withModifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const readOnly = modeler.isReadOnly();
      const selection = modeler.get('selection');

      if (withModifier && key === 'z') {
        event.preventDefault();
        if (readOnly) return;
        if (event.shiftKey) {
          if (modeler.canRedo()) modeler.redo();
        } else if (modeler.canUndo()) {
          modeler.undo();
        }
        return;
      }

      if (withModifier && key === 'y') {
        event.preventDefault();
        if (!readOnly && modeler.canRedo()) modeler.redo();
        return;
      }

      if (withModifier && key === 's') {
        event.preventDefault();
        handlersRef.current.onSave();
        return;
      }

      if (withModifier && key === 'o') {
        event.preventDefault();
        handlersRef.current.onOpen();
        return;
      }

      if (withModifier && key === 'a') {
        event.preventDefault();
        const elements = modeler
          .get('elementRegistry')
          .getAll()
          .filter((el: any) => el.type?.startsWith('workflow:') && !el.hidden);
        selection.select(elements);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const current = selection.get();
        if (current?.length && !readOnly) {
          event.preventDefault();
          modeler.get('modeling').removeElements(current.slice());
          selection.select([]);
        }
        return;
      }

      if (event.key === 'Escape') {
        handlersRef.current.onEscape();
        selection.select([]);
      } else if (event.key === '+' || event.key === '=') {
        modeler.zoom(ZOOM_STEP);
      } else if (event.key === '-') {
        modeler.zoom(1 / ZOOM_STEP);
      } else if (event.key === '0' && !withModifier) {
        event.preventDefault();
        modeler.fitViewport();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modeler, disabled, rootRef]);
}
