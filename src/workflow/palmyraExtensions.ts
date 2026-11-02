import { WorkflowType } from './types';

export type FieldType = 'text' | 'textarea' | 'number' | 'duration' | 'expression' | 'boolean' | 'select';
export type SectionKey = 'general' | 'details' | 'implementation' | 'assignment' | 'schedule' | 'form' | 'mapping' | 'headers' | 'calledElement' | 'messageSubscription' | 'multiInstance' | 'businessRef' | 'taskDescription' | 'eventDefinition' | 'gateway' | 'flow' | 'connector';

export interface PropertyField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { label: string; value: string }[];
}

export interface PropertySection {
  key: SectionKey;
  title: string;
  extensionTag?: string;
  fields?: PropertyField[];
}

export const PALMYRA_NAMESPACE = 'urn:palmyra:bpmn:extensions:1.0';

export const extensionApplicability: Record<string, WorkflowType[]> = {
  'palmyra:ioMapping': ['workflow:serviceTask', 'workflow:userTask', 'workflow:scriptTask', 'workflow:sendTask', 'workflow:receiveTask', 'workflow:callActivity', 'workflow:subProcess', 'workflow:messageIntermediateEvent', 'workflow:messageEndEvent'],
  'palmyra:taskDefinition': ['workflow:serviceTask', 'workflow:sendTask', 'workflow:messageIntermediateEvent', 'workflow:messageEndEvent'],
  'palmyra:scriptDefinition': ['workflow:scriptTask'],
  'palmyra:assignmentDefinition': ['workflow:userTask'],
  'palmyra:taskSchedule': ['workflow:userTask'],
  'palmyra:formDefinition': ['workflow:userTask', 'workflow:startEvent'],
  'palmyra:calledElement': ['workflow:callActivity'],
  'palmyra:messageSubscription': ['workflow:messageIntermediateEvent', 'workflow:receiveTask', 'workflow:messageStartEvent'],
  'palmyra:multiInstanceCollection': ['workflow:task', 'workflow:userTask', 'workflow:serviceTask', 'workflow:manualTask', 'workflow:scriptTask', 'workflow:businessRuleTask', 'workflow:sendTask', 'workflow:receiveTask', 'workflow:subProcess', 'workflow:callActivity'],
  'palmyra:taskHeaders': ['workflow:serviceTask', 'workflow:sendTask'],
  'palmyra:businessRef': ['workflow:userTask'],
  'palmyra:taskDescription': ['workflow:userTask'],
};

export const PROPERTY_SECTIONS: Record<SectionKey, PropertySection> = {
  general: { key: 'general', title: 'General' },
  details: { key: 'details', title: 'Details', fields: [{ key: 'documentation', label: 'Documentation', type: 'textarea' }] },
  implementation: {
    key: 'implementation', title: 'Implementation', extensionTag: 'palmyra:taskDefinition',
    fields: [
      { key: 'taskDefinition.type', label: 'Type', type: 'text', required: true, placeholder: 'credit-check' },
      { key: 'taskDefinition.retries', label: 'Retries', type: 'number', placeholder: '3' },
      { key: 'taskDefinition.timeout', label: 'Timeout', type: 'duration', placeholder: 'PT30S' },
      { key: 'taskDefinition.retryBackoff', label: 'Retry Backoff', type: 'duration', placeholder: 'PT10S' },
      { key: 'taskDefinition.retryBackoffMultiplier', label: 'Backoff Multiplier', type: 'number', placeholder: '1' },
      { key: 'taskDefinition.retryBackoffMaxDelay', label: 'Max Backoff Delay', type: 'duration', placeholder: 'PT1M' },
      { key: 'taskDefinition.retryBackoffSchedule', label: 'Backoff Schedule', type: 'text', placeholder: 'PT5S,PT30S,PT2M' },
    ],
  },
  assignment: {
    key: 'assignment', title: 'Assignment', extensionTag: 'palmyra:assignmentDefinition',
    fields: [
      { key: 'assignmentDefinition.assignee', label: 'Assignee', type: 'expression', placeholder: '' },
      { key: 'assignmentDefinition.candidateUsers', label: 'Candidate Users', type: 'text', placeholder: 'user1,user2' },
      { key: 'assignmentDefinition.candidateGroups', label: 'Candidate Groups', type: 'text', placeholder: 'legal_team,compliance_team' },
    ],
  },
  schedule: {
    key: 'schedule', title: 'Task Schedule', extensionTag: 'palmyra:taskSchedule',
    fields: [
      { key: 'taskSchedule.dueDate', label: 'Due Date', type: 'duration', placeholder: 'PT48H' },
      { key: 'taskSchedule.followUpDate', label: 'Follow-up Date', type: 'duration', placeholder: 'P1D' },
      { key: 'taskSchedule.priority', label: 'Priority', type: 'number', placeholder: '50' },
    ],
  },
  form: {
    key: 'form', title: 'Form', extensionTag: 'palmyra:formDefinition',
    fields: [
      { key: 'formDefinition.formKey', label: 'Form Key', type: 'text', placeholder: 'claim-review-form' },
      { key: 'formDefinition.externalReference', label: 'External Reference', type: 'text', placeholder: 'https://...' },
    ],
  },
  calledElement: {
    key: 'calledElement', title: 'Called Process', extensionTag: 'palmyra:calledElement',
    fields: [
      { key: 'calledElement.processId', label: 'Process ID', type: 'text', required: true, placeholder: 'kyc-verification' },
      { key: 'calledElement.propagateAllParentVariables', label: 'Propagate All Parent Variables', type: 'boolean' },
    ],
  },
  messageSubscription: {
    key: 'messageSubscription', title: 'Message Subscription', extensionTag: 'palmyra:messageSubscription',
    fields: [{ key: 'messageSubscription.correlationKey', label: 'Correlation Key', type: 'expression', required: true, placeholder: '' }],
  },
  multiInstance: {
    key: 'multiInstance', title: 'Multi-instance', extensionTag: 'palmyra:multiInstanceCollection',
    fields: [
      { key: 'multiInstanceCollection.inputCollection', label: 'Input Collection', type: 'expression', required: true, placeholder: '' },
      { key: 'multiInstanceCollection.inputElement', label: 'Input Element', type: 'text', placeholder: 'item' },
      { key: 'multiInstanceCollection.outputCollection', label: 'Output Collection', type: 'text', placeholder: 'results' },
      { key: 'multiInstanceCollection.outputElement', label: 'Output Element', type: 'expression', placeholder: '' },
      { key: 'multiInstanceCollection.completionCondition', label: 'Completion Condition', type: 'expression', placeholder: '' },
    ],
  },
  businessRef: {
    key: 'businessRef', title: 'Business Reference', extensionTag: 'palmyra:businessRef',
    fields: [
      { key: 'businessRef.kind', label: 'Kind', type: 'text', required: true, placeholder: 'CLAIM' },
      { key: 'businessRef.ref', label: 'Reference', type: 'expression', required: true, placeholder: '' },
      { key: 'businessRef.required', label: 'Required', type: 'boolean' },
    ],
  },
  taskDescription: {
    key: 'taskDescription', title: 'Task Description', extensionTag: 'palmyra:taskDescription',
    fields: [{ key: 'taskDescription.template', label: 'Template', type: 'textarea', required: true, placeholder: '' }],
  },
  eventDefinition: { key: 'eventDefinition', title: 'Event Definition' },
  gateway: { key: 'gateway', title: 'Gateway' },
  flow: { key: 'flow', title: 'Flow' },
  connector: { key: 'connector', title: 'Connector' },
  mapping: { key: 'mapping', title: 'Input / Output Mapping', extensionTag: 'palmyra:ioMapping' },
  headers: { key: 'headers', title: 'Task Headers', extensionTag: 'palmyra:taskHeaders' },

};

export function sectionsForType(type: WorkflowType): PropertySection[] {
  const sections: PropertySection[] = [PROPERTY_SECTIONS.general, PROPERTY_SECTIONS.details];
  if (type === 'workflow:serviceTask' || type === 'workflow:sendTask') sections.push(PROPERTY_SECTIONS.implementation, PROPERTY_SECTIONS.headers);
  if (type === 'workflow:scriptTask') sections.push({ key: 'implementation', title: 'Script', extensionTag: 'palmyra:scriptDefinition', fields: [{ key: 'scriptDefinition.expression', label: 'Expression', type: 'expression', required: true, placeholder: '= order.total * taxRate' }, { key: 'scriptDefinition.resultVariable', label: 'Result Variable', type: 'text', placeholder: 'taxAmount' }] });
  if (type === 'workflow:userTask') sections.push(PROPERTY_SECTIONS.assignment, PROPERTY_SECTIONS.schedule, PROPERTY_SECTIONS.form, PROPERTY_SECTIONS.mapping, PROPERTY_SECTIONS.businessRef, PROPERTY_SECTIONS.taskDescription);
  if (type === 'workflow:startEvent' || type === 'workflow:messageStartEvent') sections.push(PROPERTY_SECTIONS.form);
  if (type === 'workflow:callActivity') sections.push(PROPERTY_SECTIONS.calledElement, PROPERTY_SECTIONS.mapping);
  if (type === 'workflow:receiveTask' || type === 'workflow:messageIntermediateEvent') sections.push(PROPERTY_SECTIONS.messageSubscription, PROPERTY_SECTIONS.mapping);
  if (type === 'workflow:subProcess' || type === 'workflow:adHocSubProcess') sections.push(PROPERTY_SECTIONS.mapping);
  if (extensionApplicability['palmyra:multiInstanceCollection'].includes(type)) sections.push(PROPERTY_SECTIONS.multiInstance);
  if (type.includes('Event')) sections.push(PROPERTY_SECTIONS.eventDefinition);
  if (type.includes('Gateway')) sections.push(PROPERTY_SECTIONS.gateway);
  if (type === 'workflow:sequenceFlow' || type === 'workflow:messageFlow' || type === 'workflow:association' || type === 'workflow:dataAssociation') sections.push(PROPERTY_SECTIONS.flow);
  return sections;
}

export function applicableExtensions(type: WorkflowType): string[] {
  return Object.entries(extensionApplicability).filter(([, types]) => types.includes(type)).map(([tag]) => tag);
}

export function readPath(source: any, path: string): any {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

export function setPath(source: any, path: string, value: any): any {
  const next = { ...source };
  const parts = path.split('.');
  const trail: any[] = [next];
  let cursor = next;
  for (let i = 0; i < parts.length - 1; i++) {
    cursor[parts[i]] = { ...(cursor[parts[i]] || {}) };
    cursor = cursor[parts[i]];
    trail.push(cursor);
  }
  const leaf = parts[parts.length - 1];
  if (value === '' || value === undefined || value === null) {
    delete cursor[leaf];
    // an extension whose last field was cleared disappears instead of lingering as an empty `{}`
    for (let i = trail.length - 1; i > 0; i--) {
      if (Object.keys(trail[i]).length) break;
      delete trail[i - 1][parts[i - 1]];
    }
  } else cursor[leaf] = value;
  return next;
}

function isPresent(v: any): boolean { return v !== undefined && v !== null && String(v).trim() !== ''; }

export function validateProperties(type: WorkflowType, bo: any): { field?: string; message: string; level: 'error' | 'warning' }[] {
  const p = bo?.palmyra || {};
  const issues: { field?: string; message: string; level: 'error' | 'warning' }[] = [];
  if (type === 'workflow:serviceTask' || type === 'workflow:sendTask') {
    const td = p.taskDefinition;
    if (td && !isPresent(td.type)) issues.push({ field: 'taskDefinition.type', message: 'Task definition type is required', level: 'error' });
    if (td?.retries !== undefined && (!Number.isInteger(Number(td.retries)) || Number(td.retries) <= 0)) issues.push({ field: 'taskDefinition.retries', message: 'Task definition retries must be a positive integer', level: 'error' });
    if (td?.retryBackoffMultiplier !== undefined && Number(td.retryBackoffMultiplier) <= 0) issues.push({ field: 'taskDefinition.retryBackoffMultiplier', message: 'Backoff multiplier must be greater than 0', level: 'error' });
  }
  if (type === 'workflow:scriptTask' && p.scriptDefinition && !isPresent(p.scriptDefinition.expression)) issues.push({ field: 'scriptDefinition.expression', message: 'Script definition requires an expression', level: 'error' });
  if (type === 'workflow:userTask') {
    const a = p.assignmentDefinition;
    if (a && !isPresent(a.assignee) && !isPresent(a.candidateGroups) && !isPresent(a.candidateUsers)) issues.push({ message: 'User task has no assignment — task will be unassigned', level: 'warning' });
    const f = p.formDefinition;
    if (f?.formKey && f?.externalReference) issues.push({ field: 'formDefinition.externalReference', message: 'Cannot specify both formKey and externalReference', level: 'error' });
    const br = p.businessRef;
    if (br && !isPresent(br.kind)) issues.push({ field: 'businessRef.kind', message: 'Business reference kind is required', level: 'error' });
    if (br && !isPresent(br.ref)) issues.push({ field: 'businessRef.ref', message: 'Business reference ref is required', level: 'error' });
    if (br?.kind && /[=\$\{]/.test(String(br.kind))) issues.push({ field: 'businessRef.kind', message: 'Business reference kind must be a static literal', level: 'error' });
  }
  if (p.ioMapping) {
    const m = p.ioMapping;
    const inputs = Array.isArray(m.inputs) ? m.inputs : [];
    const outputs = Array.isArray(m.outputs) ? m.outputs : [];
    if (m.outputMode === 'all' && outputs.length) issues.push({ field: 'ioMapping.outputMode', message: "outputMode='all' cannot be combined with explicit output mappings", level: 'error' });
    const duplicate = (items: any[], label: string) => {
      const seen = new Set<string>();
      for (const item of items) {
        const target = String(item?.target || '').trim();
        if (!target) continue;
        if (seen.has(target)) issues.push({ field: 'ioMapping', message: `Duplicate ${label} target variable name: ${target}`, level: 'error' });
        seen.add(target);
      }
    };
    duplicate(inputs, 'input'); duplicate(outputs, 'output');
    const required = (items: any[], kind: 'inputs' | 'outputs', label: string) => items.forEach((item, i) => {
      if (!isPresent(item?.source)) issues.push({ field: `ioMapping.${kind}.${i}.source`, message: `${label} mapping ${i + 1} requires a source`, level: 'error' });
      if (!isPresent(item?.target)) issues.push({ field: `ioMapping.${kind}.${i}.target`, message: `${label} mapping ${i + 1} has no target variable`, level: 'warning' });
    });
    required(inputs, 'inputs', 'Input'); required(outputs, 'outputs', 'Output');
  }
  if (Array.isArray(p.taskHeaders?.headers)) {
    p.taskHeaders.headers.forEach((h: any, i: number) => {
      if (!isPresent(h?.key)) issues.push({ field: `taskHeaders.headers.${i}.key`, message: `Task header ${i + 1} requires a key`, level: 'error' });
    });
  }
  if (p.calledElement) {
    if (!isPresent(p.calledElement.processId)) issues.push({ field: 'calledElement.processId', message: 'Called element requires processId', level: 'error' });
    if (p.calledElement.propagateAllParentVariables && Array.isArray(p.ioMapping?.inputs) && p.ioMapping.inputs.length) issues.push({ field: 'calledElement.propagateAllParentVariables', message: 'propagateAllParentVariables cannot be combined with explicit input mappings', level: 'error' });
  }
  if (p.messageSubscription && !isPresent(p.messageSubscription.correlationKey) && type !== 'workflow:messageStartEvent') issues.push({ field: 'messageSubscription.correlationKey', message: 'Message subscription requires correlationKey expression', level: 'error' });
  if (p.multiInstanceCollection && !isPresent(p.multiInstanceCollection.inputCollection)) issues.push({ field: 'multiInstanceCollection.inputCollection', message: 'Input collection expression is required', level: 'error' });
  return issues;
}
