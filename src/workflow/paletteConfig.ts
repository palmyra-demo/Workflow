export type BpmnShapeType =
  | 'bpmn:StartEvent'
  | 'bpmn:StartEvent:Timer'
  | 'bpmn:StartEvent:Message'
  | 'bpmn:StartEvent:Signal'
  | 'bpmn:EndEvent'
  | 'bpmn:EndEvent:Terminate'
  | 'bpmn:EndEvent:Message'
  | 'bpmn:IntermediateCatchEvent'
  | 'bpmn:IntermediateCatchEvent:Timer'
  | 'bpmn:IntermediateCatchEvent:Message'
  | 'bpmn:IntermediateThrowEvent'
  | 'bpmn:BoundaryEvent'
  | 'bpmn:Task'
  | 'bpmn:UserTask'
  | 'bpmn:ServiceTask'
  | 'bpmn:ManualTask'
  | 'bpmn:ScriptTask'
  | 'bpmn:BusinessRuleTask'
  | 'bpmn:SendTask'
  | 'bpmn:ReceiveTask'
  | 'bpmn:SubProcess'
  | 'bpmn:CallActivity'
  | 'bpmn:ExclusiveGateway'
  | 'bpmn:ParallelGateway'
  | 'bpmn:InclusiveGateway'
  | 'bpmn:EventBasedGateway'
  | 'bpmn:ComplexGateway'
  | 'bpmn:DataObjectReference'
  | 'bpmn:DataStoreReference'
  | 'bpmn:Pool'
  | 'bpmn:Lane'
  | 'bpmn:Participant'
  | 'bpmn:TimerEvent'

export interface PaletteShapeConfig {
  id: string;
  type: BpmnShapeType;
  title: string;
  className: string;
  width: number;
  height: number;
  eventMarker?: string;
  taskMarker?: string;
  gatewaySymbol?: string;
}

export const Type: Record<string, BpmnShapeType> = {
  start: 'bpmn:StartEvent',
  end: 'bpmn:EndEvent',
  task: 'bpmn:Task',
  'User Task': 'bpmn:UserTask',
  'Service Task': 'bpmn:ServiceTask',
  'Manual Task': 'bpmn:ManualTask',
  'Script Task': 'bpmn:ScriptTask',
  'Business Rule Task': 'bpmn:BusinessRuleTask',
  'Send Task': 'bpmn:SendTask',
  'Receive Task': 'bpmn:ReceiveTask',
  gateway: 'bpmn:ExclusiveGateway',
  exclusive: 'bpmn:ExclusiveGateway',
  parallel: 'bpmn:ParallelGateway',
  inclusive: 'bpmn:InclusiveGateway',
  complex: 'bpmn:ComplexGateway',
  eventbased: 'bpmn:EventBasedGateway',
  timer: 'bpmn:StartEvent:Timer',
  message: 'bpmn:StartEvent:Message',
  signal: 'bpmn:StartEvent:Signal',
  subprocess: 'bpmn:SubProcess',
  callactivity: 'bpmn:CallActivity',
  dataobject: 'bpmn:DataObjectReference',
  datastore: 'bpmn:DataStoreReference',
  pool: 'bpmn:Pool',
  lane: 'bpmn:Lane',
  intermediate: 'bpmn:IntermediateCatchEvent',
  messageEvent: 'bpmn:IntermediateCatchEvent:Message',
};

export const sizeFor = (type: string): { width: number; height: number } => {
  if (type.includes('Event')) return { width: 36, height: 36 };
  if (type.includes('Gateway')) return { width: 50, height: 50 };
  if (type === 'bpmn:DataObjectReference') return { width: 36, height: 50 };
  if (type === 'bpmn:DataStoreReference') return { width: 50, height: 50 };
  if (type === 'bpmn:SubProcess') return { width: 350, height: 200 }; // created expanded, like bpmn.io
  if (type === 'bpmn:Pool' || type === 'bpmn:Participant' || type === 'bpmn:Lane') {
    return { width: 400, height: 200 };
  }
  return { width: 100, height: 80 };
};

export interface PaletteGroup {
  group: string;
  label: string;
  shapes: PaletteShapeConfig[];
}

const event = (id: string, type: BpmnShapeType, title: string, marker = 'none'): PaletteShapeConfig => ({
  id,
  type,
  title,
  className: `bpmn-icon-${id.replace('create-', '')}`,
  ...sizeFor(type),
  eventMarker: marker,
});

const task = (id: string, type: BpmnShapeType, title: string, marker?: string): PaletteShapeConfig => ({
  id,
  type,
  title,
  className: `bpmn-icon-${id.replace('create-', '')}`,
  ...sizeFor(type),
  ...(marker ? { taskMarker: marker } : {}),
});

export const paletteConfig: PaletteGroup[] = [
  {
    group: 'events',
    label: 'Events',
    shapes: [
      event('create-start-event', 'bpmn:StartEvent', 'Start Event'),
      event('create-start-event-timer', 'bpmn:StartEvent:Timer', 'Timer Start Event', 'timer'),
      event('create-start-event-message', 'bpmn:StartEvent:Message', 'Message Start Event', 'message'),
      event('create-start-event-signal', 'bpmn:StartEvent:Signal', 'Signal Start Event', 'signal'),
      event('create-end-event', 'bpmn:EndEvent', 'End Event'),
      event('create-end-event-terminate', 'bpmn:EndEvent:Terminate', 'Terminate End Event', 'terminate'),
      event('create-end-event-message', 'bpmn:EndEvent:Message', 'Message End Event', 'message'),
      event('create-intermediate-catch', 'bpmn:IntermediateCatchEvent', 'Intermediate Catch Event'),
      event('create-intermediate-timer', 'bpmn:IntermediateCatchEvent:Timer', 'Timer Catch Event', 'timer'),
      event('create-intermediate-message', 'bpmn:IntermediateCatchEvent:Message', 'Message Catch Event', 'message'),
      event('create-intermediate-throw', 'bpmn:IntermediateThrowEvent', 'Intermediate Throw Event', 'throw'),
      event('create-boundary-event', 'bpmn:BoundaryEvent', 'Boundary Event'),
    ],
  },
  {
    group: 'tasks',
    label: 'Tasks',
    shapes: [
      task('create-task', 'bpmn:Task', 'Task'),
      task('create-user-task', 'bpmn:UserTask', 'User Task', 'user'),
      task('create-service-task', 'bpmn:ServiceTask', 'Service Task', 'service'),
      task('create-manual-task', 'bpmn:ManualTask', 'Manual Task', 'manual'),
      task('create-script-task', 'bpmn:ScriptTask', 'Script Task', 'script'),
      task('create-more-task', 'bpmn:Task', 'Create more element', 'rule'),
      task('create-business-rule-task', 'bpmn:BusinessRuleTask', 'Business Rule Task', 'rule'),
      task('create-send-task', 'bpmn:SendTask', 'Send Task', 'send'),
      task('create-receive-task', 'bpmn:ReceiveTask', 'Receive Task', 'receive'),
      task('create-subprocess', 'bpmn:SubProcess', 'Sub-Process', 'subprocess'),
      task('create-call-activity', 'bpmn:CallActivity', 'Call Activity', 'call'),
    ],
  },
  {
    group: 'gateways',
    label: 'Gateways',
    shapes: [
      { id: 'create-exclusive-gateway', type: 'bpmn:ExclusiveGateway', title: 'Exclusive Gateway (XOR)', className: 'bpmn-icon-gateway-xor', ...sizeFor('bpmn:ExclusiveGateway'), gatewaySymbol: 'x' },
      { id: 'create-parallel-gateway', type: 'bpmn:ParallelGateway', title: 'Parallel Gateway', className: 'bpmn-icon-gateway-parallel', ...sizeFor('bpmn:ParallelGateway'), gatewaySymbol: 'plus' },
      { id: 'create-inclusive-gateway', type: 'bpmn:InclusiveGateway', title: 'Inclusive Gateway (OR)', className: 'bpmn-icon-gateway-or', ...sizeFor('bpmn:InclusiveGateway'), gatewaySymbol: 'circle' },
      { id: 'create-event-gateway', type: 'bpmn:EventBasedGateway', title: 'Event-based Gateway', className: 'bpmn-icon-gateway-eventbased', ...sizeFor('bpmn:EventBasedGateway'), gatewaySymbol: 'pentagon' },
      { id: 'create-complex-gateway', type: 'bpmn:ComplexGateway', title: 'Complex Gateway', className: 'bpmn-icon-gateway-complex', ...sizeFor('bpmn:ComplexGateway'), gatewaySymbol: 'asterisk' },
    ],
  },
  {
    group: 'data',
    label: 'Data',
    shapes: [
      { id: 'create-data-object', type: 'bpmn:DataObjectReference', title: 'Data Object', className: 'bpmn-icon-data-object', ...sizeFor('bpmn:DataObjectReference') },
      { id: 'create-data-store', type: 'bpmn:DataStoreReference', title: 'Data Store', className: 'bpmn-icon-data-store', ...sizeFor('bpmn:DataStoreReference') },
    ],
  },
  {
    group: 'containers',
    label: 'Containers',
    shapes: [
      { id: 'create-pool', type: 'bpmn:Pool', title: 'Pool', className: 'bpmn-icon-pool', ...sizeFor('bpmn:Pool') },
      { id: 'create-participant', type: 'bpmn:Participant', title: 'Participant', className: 'bpmn-icon-participant', ...sizeFor('bpmn:Participant') },
      { id: 'create-lane', type: 'bpmn:Lane', title: 'Lane', className: 'bpmn-icon-lane', ...sizeFor('bpmn:Lane') },
    ],
  },
];
