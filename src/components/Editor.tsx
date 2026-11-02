import { useEffect, useRef } from 'react';
import { WorkflowModeler } from '../workflow/WorkflowModeler';

interface EditorProps {
  onReady: (modeler: WorkflowModeler) => void;
  onSelectionChange: (elements: any[]) => void;
  onChange: () => void;
  onFeedback?: (message: string, level: 'error' | 'info') => void;
}

const Editor=({ onReady, onSelectionChange, onChange, onFeedback }: EditorProps)=> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<WorkflowModeler | null>(null);

  useEffect(() => {
    if (!containerRef.current || modelerRef.current) return;

    const modeler = new WorkflowModeler(containerRef.current);
    modelerRef.current = modeler;

    const eventBus = modeler.get('eventBus');

    eventBus.on('selection.changed', (e: any) => {
      onSelectionChange((e.newSelection || []).map((el: any) => el.labelTarget || el));
    });

    eventBus.on('workflow.feedback', (e: any) => onFeedback?.(e.message, e.level || 'error'));
    eventBus.on('commandStack.changed', () => onChange());
    eventBus.on('element.propertiesChanged', () => onChange());

    modeler.loadSample();
    let destroyed = false;
    const raf = requestAnimationFrame(() => {
      if (!destroyed) modeler.fitViewport();
    });

    onReady(modeler);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      modeler.destroy();
      modelerRef.current = null;
    };
  }, []);

  return <div className="editor-canvas" ref={containerRef} />;
}

export {Editor}