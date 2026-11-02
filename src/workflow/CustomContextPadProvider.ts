import { WorkflowType, categoryOf, isConnectionType, isWorkflowElement } from './types';
import { ICONS } from './contextPadIcons';
import { hasSubProcessVariants, replacementTypes } from './CustomPopupMenuProvider';
import { LANE_MIN_HEIGHT, isLane, isPool, lanesOf } from './pool/poolUtils';

type Handler = (event: any, element: any, autoActivate?: boolean) => void;

export default class CustomContextPadProvider {
  static $inject = [
    'contextPad', 'modeling', 'elementFactory', 'connect', 'create', 'autoPlace', 'customAutoPlace',
    'popupMenu', 'canvas', 'rules', 'selection', 'eventBus',
  ];

  constructor(
    contextPad: any,
    private modeling: any,
    private elementFactory: any,
    private connect: any,
    private create: any,
    private autoPlace: any,
    private placement: any,
    private popupMenu: any,
    private canvas: any,
    private rules: any,
    private selection: any,
    private eventBus: any,
  ) {
    contextPad.registerProvider(this);
  }

  getContextPadEntries(element: any): Record<string, any> {
    if (element.labelTarget) return {};
    const actions: Record<string, any> = {};
    const type = element.type as WorkflowType;
    const category = categoryOf(type);

    const entry = (id: string, group: string, title: string, icon: string, action: { click?: Handler; dragstart?: Handler }) => {
      actions[id] = { group, title, html: `<div class="entry" draggable="true" title="${title}">${icon}</div>`, action };
    };
    const del = () => entry('delete', 'edit', 'Remove', ICONS.trash, { click: () => this.modeling.removeElements([element]) });
    // entry('create-more-elements', 'edit', 'Create element', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>', { click: (event: any) => { event?.preventDefault?.(); event?.stopPropagation?.(); const anchor = (event?.target as HTMLElement | null)?.closest?.('.entry') as HTMLElement | null; window.dispatchEvent(new CustomEvent('workflow:open-element-browser', { detail: { anchor } })); } });

    if (element.waypoints || isConnectionType(type)) { del(); return actions; }
    if (type === 'workflow:group') { del(); return actions; }

    if (isLane(element)) {
      this.laneEntries(element, entry);
      del();
      return actions;
    }

    if (isPool(element)) {
      this.appendAnnotation(element, entry);
      this.laneEntries(element, entry);
      this.connectEntry(element, entry, 'Connect using message flow');
      del();
      return actions;
    }

    if (type === 'workflow:textAnnotation') {
      this.connectEntry(element, entry, 'Connect using association');
      del();
      return actions;
    }

    // flow nodes and data
    if (category === 'event' || category === 'task' || category === 'gateway') {
      this.appendEntry(element, entry, 'workflow:endEvent', 'append.end-event', 'Append end event', ICONS.endEvent);
      this.appendEntry(element, entry, 'workflow:exclusiveGateway', 'append.gateway', 'Append gateway', ICONS.gateway);
      this.appendEntry(element, entry, 'workflow:task', 'append.append-task', 'Append task', ICONS.task);
      this.appendEntry(element, entry, 'workflow:intermediateEvent', 'append.intermediate-event', 'Append intermediate/boundary event', ICONS.intermediateEvent);
    }
    this.appendAnnotation(element, entry);

    if (replacementTypes(element).length || hasSubProcessVariants(element)) {
      entry('replace', 'edit', 'Change type', ICONS.wrench, {
        click: (event: any) => this.popupMenu.open(element, 'workflow-replace', this.popupPosition(event, element)),
      });
    }

    this.connectEntry(element, entry, 'Connect using sequence/message flow or association');
    del();
    return actions;
  }

  private connectEntry(element: any, entry: Function, title: string) {
    const start: Handler = (event) => this.connect.start(event, element);
    entry('connect', 'connect', title, ICONS.connect, { click: start, dragstart: start });
  }

  private appendAnnotation(element: any, entry: Function) {
    this.appendEntry(element, entry, 'workflow:textAnnotation', 'append.text-annotation', 'Append text annotation', ICONS.textAnnotation, true);
  }

  private laneEntries(element: any, entry: Function) {
    const lanes = isPool(element) ? lanesOf(element) : [];
    const first = isPool(element) ? lanes[0] : element;
    const last = isPool(element) ? lanes[lanes.length - 1] : element;
    const canDivide = isLane(element) || lanes.length === 0;

    if (canDivide && element.height >= 2 * LANE_MIN_HEIGHT) {
      entry('lane-divide-two', 'model', 'Divide into two lanes', ICONS.laneDivide2, { click: () => this.modeling.splitLane(element, 2) });
    }
    if (canDivide && element.height >= 3 * LANE_MIN_HEIGHT) {
      entry('lane-divide-three', 'model', 'Divide into three lanes', ICONS.laneDivide3, { click: () => this.modeling.splitLane(element, 3) });
    }
    if (first) entry('lane-insert-above', 'model', 'Add lane above', ICONS.laneAbove, { click: () => this.modeling.addLane(first, 'top') });
    if (last) entry('lane-insert-below', 'model', 'Add lane below', ICONS.laneBelow, { click: () => this.modeling.addLane(last, 'bottom') });
  }

  /** Only offered when the rules would allow the connection (e.g. nothing leaves an end event). */
  private canAppend(source: any, type: WorkflowType): boolean {
    const probe = { type, parent: source.type === 'workflow:boundaryEvent' ? source.parent?.parent : source.parent, businessObject: {} };
    if (!isWorkflowElement(probe)) return false;
    const result = this.rules.allowed('connection.create', { source, target: probe });
    return !!result && (typeof result !== 'object' || result.type === 'workflow:sequenceFlow' || result.type === 'workflow:association');
  }

  private appendEntry(source: any, entry: Function, type: WorkflowType, id: string, title: string, icon: string, annotation = false) {
    if (!annotation && !this.canAppend(source, type)) return;
    if (annotation && source.type === 'workflow:textAnnotation') return;

    const newShape = () => this.elementFactory.createWorkflowShape(type);
    const hints = annotation ? { connection: { type: 'workflow:association' } } : undefined;

    entry(id, 'model', title, icon, {
      dragstart: (event: any, el: any) => this.create.start(event, newShape(), { source: el }),
      click: (_event: any, el: any) => this.append(el, newShape(), hints),
    });
  }

  private append(source: any, shape: any, hints?: any) {
    if (source.type !== 'workflow:boundaryEvent') {
      this.autoPlace.append(source, shape, hints);
      return;
    }
    // boundary events live inside their host task: the new element belongs next to the host
    const target = source.parent?.parent || this.canvas.getRootElement();
    const position = this.placement.getPosition(source, shape);
    const created = this.modeling.appendShape(source, shape, position, target, hints);
    this.selection.select(created);
    this.eventBus.fire('autoPlace.end', { source, shape: created });
  }

  /** Open the menu right below the clicked pad button (fixed, viewport coordinates). */
  private popupPosition(event: any, element: any) {
    const button = (event?.target as HTMLElement | null)?.closest?.('.entry') as HTMLElement | null;
    if (button) {
      const r = button.getBoundingClientRect();
      return { x: r.left, y: r.bottom + 4 };
    }
    if (event && typeof event.clientX === 'number') return { x: event.clientX, y: event.clientY };
    return { x: element.x, y: element.y };
  }
}
