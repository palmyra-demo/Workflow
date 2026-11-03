import { ELEMENT_TEMPLATES, getTemplate } from './elementTemplates';
import { WorkflowType, categoryOf, nextId } from './types';
import { COLLAPSED_SIZE, isCollapsedSub, isSubProcessLike } from './pool/poolUtils';

export const REPLACE_MENU_ID = 'workflow-replace';

const eventRole = (type: string) => {
  const t = type.toLowerCase();
  return t.includes('start')
    ? 'start'
    : t.includes('end')
      ? 'end'
      : t.includes('intermediate') || t.includes('link')
        ? 'intermediate'
        : t;
};

const CONTAINER_TASKS = new Set(['workflow:subProcess', 'workflow:adHocSubProcess', 'workflow:transaction']);

export const SUB_PROCESS_VARIANTS: Array<{ type: WorkflowType; expanded: boolean; label: string }> = [
  { type: 'workflow:subProcess', expanded: false, label: 'Sub-process (collapsed)' },
  { type: 'workflow:subProcess', expanded: true, label: 'Sub-process (expanded)' },
  { type: 'workflow:adHocSubProcess', expanded: false, label: 'Ad-hoc sub-process (collapsed)' },
  { type: 'workflow:adHocSubProcess', expanded: true, label: 'Ad-hoc sub-process (expanded)' },
];
const VARIANT_TYPES = new Set<string>(['workflow:subProcess', 'workflow:adHocSubProcess']);

export const hasSubProcessVariants = (element: any): boolean =>
  categoryOf(element.type as WorkflowType) === 'task' && element.type !== 'workflow:boundaryEvent';

export function replacementTypes(element: any): WorkflowType[] {
  const current = element.type as WorkflowType;
  const category = categoryOf(current);
  if (!['event', 'task', 'gateway', 'data'].includes(category)) return [];
  if (current === 'workflow:boundaryEvent') return [];
  const hasContent = (element.children || []).some(
    (c: any) => !c.waypoints && c.type !== 'workflow:boundaryEvent',
  );

  return ELEMENT_TEMPLATES.filter((t) => {
    if (t.type === current || categoryOf(t.type) !== category) return false;
    if (t.type === 'workflow:boundaryEvent') return false;
    if (VARIANT_TYPES.has(t.type)) return false;
    if (category === 'event' && eventRole(t.type) !== eventRole(current)) return false;
    if (category === 'task' && hasContent && !CONTAINER_TASKS.has(t.type)) return false;
    return true;
  }).map((t) => t.type);
}

export default class CustomPopupMenuProvider {
  static $inject = ['popupMenu', 'modeling', 'selection'];

  constructor(
    popupMenu: any,
    private modeling: any,
    private selection: any,
  ) {
    popupMenu.registerProvider(REPLACE_MENU_ID, this);
  }

  getPopupMenuEntries(element: any): Record<string, any> {
    const entries: Record<string, any> = {};
    const current = getTemplate(element.type as WorkflowType);
    if (current && !VARIANT_TYPES.has(element.type)) {
      entries[`current-${current.type}`] = {
        label: current.title,
        className: 'workflow-replace-entry',
        title: `Current type: ${current.title}`,
        active: true,
        disabled: false,
        action: () => {},
      };
    }
    for (const type of replacementTypes(element)) {
      const t = getTemplate(type)!;
      entries[`replace-with-${type}`] = {
        label: t.title,
        className: 'workflow-replace-entry',
        title: `Change to ${t.title}`,
        action: () => this.replace(element, type),
      };
    }
    if (hasSubProcessVariants(element)) {
      const expanded = !isCollapsedSub(element);
      for (const v of SUB_PROCESS_VARIANTS) {
        const isCurrent = element.type === v.type && expanded === v.expanded;
        entries[`variant-${v.type}-${v.expanded ? 'expanded' : 'collapsed'}`] = {
          label: v.label,
          className: 'workflow-replace-entry',
          title: isCurrent ? `Current type: ${v.label}` : `Change to ${v.label}`,
          active: isCurrent,
          action: () => {
            if (!isCurrent) this.applyVariant(element, v);
          },
        };
      }
    }
    return entries;
  }

  getPopupMenuHeaderEntries() {
    return {};
  }

  getEmptyPlaceholder() {
    return 'This element cannot be changed to another type.';
  }

  applyVariant(element: any, v: { type: WorkflowType; expanded: boolean }) {
    if (isSubProcessLike(element) && element.type === v.type) {
      if (!isCollapsedSub(element) !== v.expanded) this.modeling.toggleSubProcess(element);
      return element;
    }
    const wasExpanded = !isCollapsedSub(element);
    const shape = this.replace(element, v.type, { isExpanded: v.expanded });

    if (isSubProcessLike(element) && wasExpanded !== v.expanded) this.modeling.toggleSubProcess(shape);
    this.selection.select(shape);
    return shape;
  }

  replace(element: any, newType: WorkflowType, opts: { isExpanded?: boolean } = {}) {
    const template = getTemplate(newType)!;
    const oldBo = element.businessObject || {};
    const toSub = CONTAINER_TASKS.has(newType);
    const bothSub = toSub && isSubProcessLike(element);
    const keepSize = bothSub || (!toSub && !CONTAINER_TASKS.has(element.type));
    const collapsedNew = toSub && !bothSub && opts.isExpanded === false;

    const width = keepSize ? element.width : collapsedNew ? COLLAPSED_SIZE.width : template.width;
    const height = keepSize ? element.height : collapsedNew ? COLLAPSED_SIZE.height : template.height;

    const businessObject = {
      ...oldBo,
      id: nextId(newType),
      type: newType,

      eventType: undefined,
      taskType: undefined,
      gatewayType: undefined,
      eventDefinition: undefined,
      bpmnType: undefined,

      ...(bothSub ? {} : { isExpanded: collapsedNew ? false : undefined, expandedBounds: undefined }),
    };

    const newShape = this.modeling.replaceShape(
      element,
      {
        type: newType,
        businessObject,
        width,
        height,
        x: element.x + element.width / 2,
        y: element.y + element.height / 2,
      },
      { autoResize: false },
    );
    this.selection.select(newShape);
    return newShape;
  }
}
