export type WorkflowType =
  | 'workflow:startEvent' | 'workflow:endEvent' | 'workflow:intermediateEvent'
  | 'workflow:messageStartEvent' | 'workflow:messageIntermediateEvent' | 'workflow:messageEndEvent'
  | 'workflow:timerStartEvent' | 'workflow:timerIntermediateEvent' | 'workflow:timerEndEvent'
  | 'workflow:signalStartEvent' | 'workflow:signalIntermediateEvent' | 'workflow:signalEndEvent'
  | 'workflow:errorStartEvent' | 'workflow:errorEndEvent'
  | 'workflow:conditionalStartEvent' | 'workflow:conditionalIntermediateEvent'
  | 'workflow:escalationStartEvent' | 'workflow:escalationIntermediateEvent' | 'workflow:escalationEndEvent'
  | 'workflow:compensationIntermediateEvent' | 'workflow:compensationEndEvent'
  | 'workflow:linkIntermediateEvent' | 'workflow:multipleStartEvent' | 'workflow:multipleIntermediateEvent' | 'workflow:multipleEndEvent'
  | 'workflow:parallelMultipleStartEvent' | 'workflow:parallelMultipleIntermediateEvent' | 'workflow:parallelMultipleEndEvent'
  | 'workflow:cancelEndEvent' | 'workflow:terminateEndEvent' | 'workflow:boundaryEvent'
  | 'workflow:task' | 'workflow:userTask' | 'workflow:serviceTask' | 'workflow:manualTask' | 'workflow:scriptTask'
  | 'workflow:businessRuleTask' | 'workflow:sendTask' | 'workflow:receiveTask' | 'workflow:subProcess' | 'workflow:adHocSubProcess' | 'workflow:callActivity' | 'workflow:transaction'
  | 'workflow:exclusiveGateway' | 'workflow:parallelGateway' | 'workflow:inclusiveGateway' | 'workflow:eventBasedGateway' | 'workflow:complexGateway'
  | 'workflow:dataObject' | 'workflow:dataInput' | 'workflow:dataOutput' | 'workflow:dataStore'
  | 'workflow:pool' | 'workflow:lane' | 'workflow:group' | 'workflow:textAnnotation'
  | 'workflow:sequenceFlow' | 'workflow:messageFlow' | 'workflow:association' | 'workflow:dataAssociation' | 'workflow-timerEvent'

export type WorkflowCategory = 'event' | 'task' | 'gateway' | 'data' | 'container' | 'artifact' | 'connection';

export interface WorkflowBusinessObject {
  id: string;
  type: WorkflowType;
  name?: string;
  documentation?: string;
  taskType?: string;
  assignee?: string;
  eventType?: string;
  eventDefinition?: string;
  gatewayType?: string;
  conditionExpression?: string;
  customProperties?: Record<string, unknown>;
  palmyra?: Record<string, any>;
  bpmnType?: string;
  /** sub-processes: false = collapsed (children hidden, shown as a small box with a + marker). Missing = expanded. */
  isExpanded?: boolean;
  /** where the expanded shape was before it was collapsed, relative to the collapsed shape's top-left */
  expandedBounds?: { dx: number; dy: number; width: number; height: number };
}

export function isConnectionType(type: unknown): type is WorkflowType {
  return type === 'workflow:sequenceFlow' || type === 'workflow:messageFlow' || type === 'workflow:association' || type === 'workflow:dataAssociation';
}

const EVENTS = /^(workflow:)(startEvent|endEvent|intermediateEvent|boundaryEvent|message|timer|signal|error|conditional|escalation|compensation|link|multiple|parallelMultiple|cancel|terminate)/;
export function categoryOf(type: WorkflowType): WorkflowCategory {
  if (isConnectionType(type)) return 'connection';
  if (EVENTS.test(type)) return 'event';
  const t = String(type);
  if (t.includes('Gateway')) return 'gateway';
  if (t.includes('dataObject') || t.includes('dataInput') || t.includes('dataOutput') || t.includes('dataStore')) return 'data';
  if (t === 'workflow:pool' || t === 'workflow:lane') return 'container';
  if (t === 'workflow:group' || t === 'workflow:textAnnotation') return 'artifact';
  return 'task';
}
export function isWorkflowType(type: unknown): type is WorkflowType { return typeof type === 'string' && type.startsWith('workflow:'); }
export function isWorkflowElement(element: unknown): boolean { return isWorkflowType((element as any)?.type); }
let idCounter = 0;
export function nextId(type: WorkflowType): string { idCounter += 1; return `${type.replace('workflow:','')}_${idCounter}_${Math.random().toString(36).slice(2,8)}`; }
