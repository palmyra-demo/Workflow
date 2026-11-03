import { useEffect, useRef } from 'react';
import { WorkflowModeler } from '../workflow/WorkflowModeler';
import type { WorkflowGraph } from '../workflow/io/graph';
import type { ToastLevel } from '../hooks/useToast';

export interface EditorProps {
  onReady: (modeler: WorkflowModeler) => void;
  onSelectionChange: (elements: any[]) => void;
  onChange: () => void;
  onFeedback?: (message: string, level: ToastLevel) => void;
  initialGraph?: WorkflowGraph | null;
}

export function Editor({ onReady, onSelectionChange, onChange, onFeedback, initialGraph }: EditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const callbacks = useRef({ onReady, onSelectionChange, onChange, onFeedback });
  callbacks.current = { onReady, onSelectionChange, onChange, onFeedback };

  const initialGraphRef = useRef(initialGraph);

  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new WorkflowModeler(containerRef.current);
    const eventBus = modeler.get('eventBus');

    eventBus.on('selection.changed', (event: any) => {
      const selected = (event.newSelection || []).map((el: any) => el.labelTarget || el);
      callbacks.current.onSelectionChange(selected);
    });
    eventBus.on('workflow.feedback', (event: any) => {
      callbacks.current.onFeedback?.(event.message, event.level || 'error');
    });
    eventBus.on('commandStack.changed', () => callbacks.current.onChange());
    eventBus.on('element.propertiesChanged', () => callbacks.current.onChange());

    const graph = initialGraphRef.current;
    if (graph === undefined) modeler.loadSample();
    else if (graph) modeler.openGraph(graph, false);

    let destroyed = false;
    const frame = requestAnimationFrame(() => {
      if (!destroyed) modeler.fitViewport();
    });

    callbacks.current.onReady(modeler);

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      modeler.destroy();
    };
  }, []);

  return <div className="editor-canvas" ref={containerRef} />;
}
