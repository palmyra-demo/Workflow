import Diagram from 'diagram-js';

import { CoreModule, WorkflowModule } from './modules';
import { WorkflowType } from './types';
import { exportGraph, importGraph, WorkflowGraph } from './io/graph';
import { serializeToXml, parseXml } from './io/xml';
import { serializeToJson, parseJson } from './io/json';
import { validate, ValidationIssue } from './validation';

export class WorkflowModeler {
  private diagram: any;
  private container: HTMLElement;
  private readOnly = false;

  private bypass = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.diagram = new Diagram({
      canvas: { container },
      keyboard: { bindTo: document },
      modules: [CoreModule, WorkflowModule],
    });

    const canvas = this.get('canvas');
    if (!canvas.getRootElement()) {
      const root = this.get('elementFactory').createRoot({ id: 'workflowRoot' });
      canvas.setRootElement(root);
    }

    this.installReadOnlyGuard();
  }

  private installReadOnlyGuard(): void {
    const commandStack = this.get('commandStack');
    (['execute', 'undo', 'redo'] as const).forEach((method) => {
      const original = commandStack[method].bind(commandStack);
      commandStack[method] = (...args: any[]) =>
        this.readOnly && !this.bypass ? undefined : original(...args);
    });

    const directEditing = this.get('directEditing');
    const activate = directEditing.activate.bind(directEditing);
    directEditing.activate = (...args: any[]) => (this.readOnly ? false : activate(...args));

    const eventBus = this.get('eventBus');
    const canvas = this.get('canvas');
    eventBus.on('element.mousedown', 100000, (e: any) => {
      if (this.readOnly && e.element && e.element !== canvas.getRootElement()) return false;
    });
    eventBus.on('element.dblclick', 100000, () => (this.readOnly ? false : undefined));
  }

  isReadOnly(): boolean {
    return this.readOnly;
  }

  setReadOnly(readOnly: boolean): void {
    if (this.readOnly === readOnly) return;
    this.readOnly = readOnly;
    this.container.classList.toggle('read-only', readOnly);
    try {
      this.get('selection').select([]);
    } catch {}
    this.get('eventBus').fire('workflow.readOnly.changed', { readOnly });
  }

  withEditing<T>(fn: () => T): T {
    this.bypass++;
    try {
      return fn();
    } finally {
      this.bypass--;
    }
  }

  openGraph(graph: WorkflowGraph, readOnly: boolean): void {
    this.get('subProcessView').reset();
    this.withEditing(() => {
      importGraph(this.diagram, graph);
      this.get('commandStack').clear();
    });
    this.setReadOnly(readOnly);
    this.fitViewport();
  }

  get<T = any>(name: string): T {
    return this.diagram.get(name);
  }

  get instance(): any {
    return this.diagram;
  }

  destroy(): void {
    this.diagram.destroy();
  }

  createElementAt(type: WorkflowType, position: { x: number; y: number }, name?: string): any {
    const elementFactory = this.get('elementFactory');
    const modeling = this.get('modeling');
    const canvas = this.get('canvas');

    const shape = elementFactory.createWorkflowShape(type, { name });
    return modeling.createShape(shape, position, canvas.getRootElement());
  }

  undo(): void {
    this.get('commandStack').undo();
  }
  redo(): void {
    this.get('commandStack').redo();
  }
  canUndo(): boolean {
    return this.get('commandStack').canUndo();
  }
  canRedo(): boolean {
    return this.get('commandStack').canRedo();
  }

  zoom(factor: number): void {
    const canvas = this.get('canvas');
    canvas.zoom(canvas.zoom() * factor);
  }
  fitViewport(): void {
    try {
      const canvas = this.get('canvas');

      const viewport = canvas.getSize ? canvas.getSize() : null;
      if (viewport && (!viewport.width || !viewport.height)) return;

      const hasElements = this.get('elementRegistry')
        .getAll()
        .some((e: any) => e.type && e.type.startsWith('workflow:'));
      if (!hasElements) {
        canvas.zoom(1);
        return;
      }

      canvas.zoom('fit-viewport', 'auto');
    } catch {
      return;
    }
  }
  resetZoom(): void {
    this.get('canvas').zoom(1);
  }

  getGraph(): WorkflowGraph {
    return exportGraph(this.get('elementRegistry'));
  }
  setGraph(graph: WorkflowGraph): void {
    importGraph(this.diagram, graph);
  }

  exportXml(): string {
    const issues = this.validate();
    const errors = issues.filter((i) => i.level === 'error');
    if (errors.length)
      throw new Error(
        `Cannot save XML: ${errors.length} validation error(s). Fix validation errors before exporting.`,
      );
    return serializeToXml(this.getGraph());
  }
  importXml(xml: string): void {
    this.setGraph(parseXml(xml));
  }

  exportJson(): string {
    return serializeToJson(this.getGraph());
  }
  importJson(json: string): void {
    this.setGraph(parseJson(json));
  }

  validate(): ValidationIssue[] {
    return validate(this.getGraph());
  }

  clear(): void {
    const modeling = this.get('modeling');
    const elementRegistry = this.get('elementRegistry');
    const all = elementRegistry.getAll().filter((e: any) => e.type && e.type.startsWith('workflow:'));
    if (all.length) modeling.removeElements(all.slice());
  }

  loadSample(): void {
    const start = this.createElementAt('workflow:startEvent', { x: 160, y: 200 }, 'Start');
    const task = this.createElementAt('workflow:userTask', { x: 340, y: 200 }, 'Review Request');
    const gateway = this.createElementAt('workflow:exclusiveGateway', { x: 520, y: 200 }, 'Approved?');
    const approve = this.createElementAt('workflow:serviceTask', { x: 700, y: 120 }, 'Provision Access');
    const reject = this.createElementAt('workflow:endEvent', { x: 700, y: 300 }, 'Rejected');
    const done = this.createElementAt('workflow:endEvent', { x: 880, y: 120 }, 'Done');

    const modeling = this.get('modeling');
    modeling.connect(start, task);
    modeling.connect(task, gateway);
    modeling.connect(gateway, approve);
    modeling.connect(gateway, reject);
    modeling.connect(approve, done);
  }
}
