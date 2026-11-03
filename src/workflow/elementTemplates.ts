import { WorkflowType, categoryOf } from './types';

export interface ElementTemplate {
  type: WorkflowType;
  title: string;
  glyph: string;
  width: number;
  height: number;
  defaultName?: string;
  group: string;
}

type Row = [
  type: WorkflowType,
  title: string,
  glyph: string,
  width: number,
  height: number,
  defaultName?: string,
];

const createGroup = (group: string, rows: Row[]): ElementTemplate[] =>
  rows.map(([type, title, glyph, width, height, defaultName]) => ({
    type,
    title,
    glyph,
    width,
    height,
    group,
    defaultName,
  }));

const EVENTS: Row[] = [
  ['workflow:startEvent', 'Start Event', '○', 40, 40, 'Start'],
  ['workflow:intermediateEvent', 'Intermediate Event', '◎', 40, 40, 'Intermediate'],
  ['workflow:endEvent', 'End Event', '◎', 40, 40, 'End'],
  ['workflow:messageStartEvent', 'Message Start Event', '✉', 40, 40, 'Message Start'],
  ['workflow:messageIntermediateEvent', 'Message Intermediate Event', '✉', 40, 40, 'Message'],
  ['workflow:messageEndEvent', 'Message End Event', '✉', 40, 40, 'Message End'],
  ['workflow:timerStartEvent', 'Timer Start Event', '◷', 40, 40, 'Timer Start'],
  ['workflow:timerIntermediateEvent', 'Timer Intermediate Event', '◷', 40, 40, 'Timer'],
  ['workflow:timerEndEvent', 'Timer End Event', '◷', 40, 40, 'Timer End'],
  ['workflow:signalStartEvent', 'Signal Start Event', '△', 40, 40, 'Signal Start'],
  ['workflow:signalIntermediateEvent', 'Signal Intermediate Event', '△', 40, 40, 'Signal'],
  ['workflow:signalEndEvent', 'Signal End Event', '△', 40, 40, 'Signal End'],
  ['workflow:errorStartEvent', 'Error Start Event', '⚡', 40, 40, 'Error Start'],
  ['workflow:errorEndEvent', 'Error End Event', '⚡', 40, 40, 'Error End'],
  ['workflow:conditionalStartEvent', 'Conditional Start Event', '⌁', 40, 40, 'Conditional Start'],
  ['workflow:conditionalIntermediateEvent', 'Conditional Intermediate Event', '⌁', 40, 40, 'Conditional'],
  ['workflow:escalationStartEvent', 'Escalation Start Event', '⇧', 40, 40, 'Escalation Start'],
  ['workflow:escalationIntermediateEvent', 'Escalation Intermediate Event', '⇧', 40, 40, 'Escalation'],
  ['workflow:escalationEndEvent', 'Escalation End Event', '⇧', 40, 40, 'Escalation End'],
  ['workflow:compensationIntermediateEvent', 'Compensation Event', '↶', 40, 40, 'Compensation'],
  ['workflow:compensationEndEvent', 'Compensation End Event', '↶', 40, 40, 'Compensation End'],
  ['workflow:linkIntermediateEvent', 'Link Event', '↗', 40, 40, 'Link'],
  ['workflow:multipleStartEvent', 'Multiple Start Event', '✣', 40, 40, 'Multiple Start'],
  ['workflow:multipleIntermediateEvent', 'Multiple Intermediate Event', '✣', 40, 40, 'Multiple'],
  ['workflow:multipleEndEvent', 'Multiple End Event', '✣', 40, 40, 'Multiple End'],
  [
    'workflow:parallelMultipleStartEvent',
    'Parallel Multiple Start Event',
    '✣',
    40,
    40,
    'Parallel Multiple Start',
  ],
  [
    'workflow:parallelMultipleIntermediateEvent',
    'Parallel Multiple Intermediate Event',
    '✣',
    40,
    40,
    'Parallel Multiple',
  ],
  ['workflow:parallelMultipleEndEvent', 'Parallel Multiple End Event', '✣', 40, 40, 'Parallel Multiple End'],
  ['workflow:cancelEndEvent', 'Cancel End Event', '⊘', 40, 40, 'Cancel'],
  ['workflow:boundaryEvent', 'Boundary Event', '◎', 40, 40, 'Boundary'],
  ['workflow:terminateEndEvent', 'Terminate End Event', '⊗', 40, 40, 'Terminate'],
];

const ACTIVITIES: Row[] = [
  ['workflow:task', 'Task', '▭', 120, 80, 'Task'],
  ['workflow:userTask', 'User Task', '♙', 120, 80, 'User Task'],
  ['workflow:serviceTask', 'Service Task', '⚙', 120, 80, 'Service Task'],
  ['workflow:manualTask', 'Manual Task', '☝', 120, 80, 'Manual Task'],
  ['workflow:scriptTask', 'Script Task', '≡', 120, 80, 'Script Task'],
  ['workflow:businessRuleTask', 'Business Rule Task', '▤', 120, 80, 'Business Rule Task'],
  ['workflow:sendTask', 'Send Task', '✉', 120, 80, 'Send Task'],
  ['workflow:receiveTask', 'Receive Task', '☏', 120, 80, 'Receive Task'],
  ['workflow:subProcess', 'Sub Process', '⊞', 350, 200, 'Sub Process'],
  ['workflow:adHocSubProcess', 'Ad-hoc Sub Process', '~', 350, 200, 'Ad-hoc Sub Process'],
  ['workflow:callActivity', 'Call Activity', '⊕', 120, 80, 'Call Activity'],
  ['workflow:transaction', 'Transaction', '⊞', 350, 200, 'Transaction'],
];

const GATEWAYS: Row[] = [
  ['workflow:exclusiveGateway', 'Exclusive Gateway', '×', 50, 50, 'Gateway'],
  ['workflow:parallelGateway', 'Parallel Gateway', '+', 50, 50, 'Parallel Gateway'],
  ['workflow:inclusiveGateway', 'Inclusive Gateway', '○', 50, 50, 'Inclusive Gateway'],
  ['workflow:eventBasedGateway', 'Event-Based Gateway', '◇', 50, 50, 'Event-Based Gateway'],
  ['workflow:complexGateway', 'Complex Gateway', '*', 50, 50, 'Complex Gateway'],
];

const DATA: Row[] = [
  ['workflow:dataObject', 'Data Object', '▱', 50, 60, 'Data Object'],
  ['workflow:dataInput', 'Data Input', '▱', 50, 60, 'Data Input'],
  ['workflow:dataOutput', 'Data Output', '▱', 50, 60, 'Data Output'],
  ['workflow:dataStore', 'Data Store', '▤', 70, 60, 'Data Store'],
];

const CONTAINERS: Row[] = [
  ['workflow:pool', 'Participant / Pool', '▤', 600, 220, 'Pool'],
  ['workflow:lane', 'Lane', '▤', 500, 120, 'Lane'],
];

const ARTIFACTS: Row[] = [
  ['workflow:group', 'Group', '▢', 220, 120, 'Group'],
  ['workflow:textAnnotation', 'Text Annotation', '▱', 140, 60, 'Annotation'],
];

export const ELEMENT_TEMPLATES: ElementTemplate[] = [
  ...createGroup('events', EVENTS),
  ...createGroup('activities', ACTIVITIES),
  ...createGroup('gateways', GATEWAYS),
  ...createGroup('data', DATA),
  ...createGroup('containers', CONTAINERS),
  ...createGroup('artifacts', ARTIFACTS),
];

const TEMPLATE_BY_TYPE = new Map(ELEMENT_TEMPLATES.map((template) => [template.type, template]));

export const getTemplate = (type: WorkflowType) => TEMPLATE_BY_TYPE.get(type);

export function defaultSize(type: WorkflowType) {
  const template = TEMPLATE_BY_TYPE.get(type);
  if (template) return { width: template.width, height: template.height };
  if (categoryOf(type) === 'container') return { width: 600, height: 220 };
  return { width: 100, height: 80 };
}
