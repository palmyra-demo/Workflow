import { PointerEvent as ReactPointerEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { ActionIcon, Tooltip, UnstyledButton } from '@mantine/core';
import { WorkflowModeler } from '../workflow/WorkflowModeler';
import { WorkflowType, categoryOf } from '../workflow/types';
import { PropertyField, readPath, sectionsForType, setPath, validateProperties } from '../workflow/palmyraExtensions';
import { BooleanField, SelectField, TextAreaField, TextField } from './properties/fields';
import { ChevronIcon, Group } from './properties/Group';
import { ListGroup } from './properties/ListEditor';
import { ElementIcon } from './properties/ElementIcon';
import './properties/properties-panel.css';

interface Props {
  modeler: WorkflowModeler | null;
  element: any | null;
  selectionCount?: number;
  /** published version: show values but disable every control */
  readOnly?: boolean;
}

type Issue = { field?: string; message: string; level: 'error' | 'warning' };

const OPEN_KEY = 'workflow.propertiesPanel.open';
const WIDTH_KEY = 'workflow.propertiesPanel.width';
const DEFAULT_WIDTH = 300, MIN_WIDTH = 260, MAX_WIDTH = 640, RAIL_WIDTH = 40;

const readOpen = () => { try { return localStorage.getItem(OPEN_KEY) !== 'false'; } catch { return true; } };
const readWidth = () => {
  try { const w = Number(localStorage.getItem(WIDTH_KEY)); return w >= MIN_WIDTH && w <= MAX_WIDTH ? w : DEFAULT_WIDTH; } catch { return DEFAULT_WIDTH; }
};
const clampWidth = (w: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)));

export default function PropertiesPanel({ modeler, element, selectionCount, readOnly = false }: Props) {
  const [, forceRender] = useState(0);
  const [open, setOpen] = useState(readOpen);
  const [width, setWidth] = useState(readWidth);
  const [resizing, setResizing] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!modeler) return;
    const eventBus = modeler.get('eventBus');
    const handler = (e: any) => { if (!element || e.element === element || (e.elements || []).includes(element)) forceRender((n) => n + 1); };
    eventBus.on('element.propertiesChanged', handler);
    eventBus.on('elements.changed', handler);
    return () => { eventBus.off('element.propertiesChanged', handler); eventBus.off('elements.changed', handler); };
  }, [modeler, element]);

  const resizeCanvas = () => { try { modeler?.get('canvas').resized(); } catch { /* not ready */ } };
  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, String(open)); } catch { /* storage is optional */ }
    const t = setTimeout(resizeCanvas, 260);
    return () => clearTimeout(t);
  }, [open, modeler]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const right = asideRef.current?.getBoundingClientRect().right ?? window.innerWidth;
    let frame = 0, latest = width;
    setResizing(true);
    const move = (e: PointerEvent) => {
      latest = clampWidth(right - e.clientX);
      setWidth(latest);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resizeCanvas);
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      setResizing(false);
      try { localStorage.setItem(WIDTH_KEY, String(latest)); } catch { /* optional */ }
      resizeCanvas();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };
  const resetWidth = () => { setWidth(DEFAULT_WIDTH); try { localStorage.setItem(WIDTH_KEY, String(DEFAULT_WIDTH)); } catch { /* optional */ } resizeCanvas(); };

  const bo = element?.businessObject;
  const type = element?.type as WorkflowType | undefined;
  const count = selectionCount ?? (element ? 1 : 0);

  let title: ReactNode = 'Properties';
  let sub: ReactNode = null;
  let icon: ReactNode = null;
  let body: ReactNode;

  if (!bo || !type) {
    if (count > 1) { title = 'Multiple elements'; sub = `${count} elements selected`; }
    body = <p className="bpp-placeholder">{count > 1 ? 'Select a single element to edit its properties.' : 'Select an element to edit its properties.'}</p>;
  } else {
    title = bo.name || displayType(type);
    sub = bo.name ? displayType(type) : bo.id;
    icon = <ElementIcon type={type} />;
    body = <ElementProperties key={element.id} modeler={modeler} element={element} />;
  }

  return (
    <aside
      ref={asideRef}
      aria-label="Properties panel"
      className={`bpp${resizing ? ' is-resizing' : ''}`}
      style={{ width: open ? width : RAIL_WIDTH }}
      onTransitionEnd={(e) => { if (e.target === e.currentTarget && e.propertyName === 'width') resizeCanvas(); }}
    >
      {!open && (
        <UnstyledButton className="bpp-rail" onClick={() => setOpen(true)} title="Open properties panel" aria-label="Open properties panel">
          <ChevronIcon />
          <span>Properties Panel</span>
        </UnstyledButton>
      )}

      <div className="bpp-inner" style={{ width }} aria-hidden={!open}>
        {open && <div className="bpp-resizer" role="separator" aria-orientation="vertical" aria-label="Resize properties panel" onPointerDown={startResize} onDoubleClick={resetWidth} />}
        <header className="bpp-header">
          {icon && <div className="bpp-header-icon">{icon}</div>}
          <div className="bpp-header-text">
            <h2 className="bpp-header-title" title={typeof title === 'string' ? title : undefined}>{title}</h2>
            {sub && <div className="bpp-header-sub">{sub}</div>}
          </div>
          <Tooltip label="Collapse panel" openDelay={400} withArrow position="bottom">
            <ActionIcon className="bpp-collapse" variant="subtle" color="gray" size="md" onClick={() => setOpen(false)} aria-label="Close properties panel" tabIndex={open ? 0 : -1}>
              <ChevronIcon />
            </ActionIcon>
          </Tooltip>
        </header>
        <div className="bpp-scroll">
          <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>{body}</fieldset>
        </div>
      </div>
    </aside>
  );
}


function ElementProperties({ modeler, element }: { modeler: WorkflowModeler | null; element: any }) {
  const bo = element.businessObject;
  const type = element.type as WorkflowType;
  const sections = sectionsForType(type);
  const issues = validateProperties(type, bo) as Issue[];
  const issueFor = (field: string) => issues.find((i) => i.field === field)?.message;
  const hasIssue = (prefix: string) => issues.some((i) => i.field?.startsWith(prefix));

  const update = (properties: Record<string, unknown>) => {
    if (!modeler || !modeler.get('elementRegistry').get(element.id)) return;
    modeler.get('modeling').updateProperties(element, properties);
  };
  const updateStandard = (path: string, value: any) => update({ [path]: value });
  const updatePalmyra = (key: string, value: any) => {
    const next = { ...(bo.palmyra || {}) };
    if (value === undefined) delete next[key]; else next[key] = value;
    update({ palmyra: next });
  };
  const updatePath = (path: string, value: any) => update({ palmyra: setPath(bo.palmyra || {}, path, value) });

  const flowLike = ['workflow:sequenceFlow', 'workflow:messageFlow', 'workflow:association', 'workflow:dataAssociation'].includes(type);
  const hasMapping = ['workflow:serviceTask', 'workflow:sendTask', 'workflow:userTask', 'workflow:receiveTask', 'workflow:callActivity', 'workflow:subProcess', 'workflow:adHocSubProcess', 'workflow:scriptTask', 'workflow:messageIntermediateEvent'].includes(type);
  const hasHeaders = type === 'workflow:serviceTask' || type === 'workflow:sendTask';
  const SKIP = ['general', 'details', 'flow', 'eventDefinition', 'gateway', 'mapping', 'headers'];

  return (
    <>
      <Group id="general" title="General" defaultOpen>
        <TextField label="Id" value={bo.id} readOnly />
        <TextField label="Name" value={bo.name || ''} onChange={(v) => updateStandard('name', v)} placeholder="Element name" />
      </Group>

      <Group id="documentation" title="Documentation" dirty={Boolean(bo.documentation)}>
        <TextAreaField label="Element documentation" value={bo.documentation || ''} onChange={(v) => updateStandard('documentation', v)} rows={3} />
      </Group>

      {(type === 'workflow:pool' || type === 'workflow:lane') && <ContainerSection element={element} bo={bo} update={update} />}

      {type === 'workflow:sequenceFlow' && (
        <Group id="flow" title="Flow condition" defaultOpen dirty={Boolean(bo.conditionExpression)}>
          <TextField label="Condition expression" value={bo.conditionExpression || ''} onChange={(v) => updateStandard('conditionExpression', v)} placeholder="= amount > 10000" help="Standard BPMN conditionExpression." mono />
        </Group>
      )}
      {type === 'workflow:messageFlow' && (
        <Group id="flow" title="Message" defaultOpen dirty={Boolean(bo.messageName)}>
          <TextField label="Message name" value={bo.messageName || ''} onChange={(v) => updateStandard('messageName', v)} placeholder="Payment Received" />
        </Group>
      )}
      {(type === 'workflow:association' || type === 'workflow:dataAssociation') && (
        <Group id="flow" title="Association" defaultOpen>
          <SelectField label="Direction" value={bo.associationDirection || 'None'} onChange={(v) => updateStandard('associationDirection', v)} options={['None', 'One', 'Both']} />
        </Group>
      )}

      {!flowLike && type.includes('Event') && <EventSection type={type} bo={bo} updatePath={updatePath} />}
      {categoryOf(type) === 'gateway' && <GatewaySection bo={bo} update={update} />}

      {sections.filter((s) => !SKIP.includes(s.key)).map((section) => (
        <DynamicSection key={section.key} id={section.key} title={section.title} fields={section.fields || []} bo={bo} updatePath={updatePath} issueFor={issueFor} />
      ))}

      {hasMapping && <MappingGroups bo={bo} updatePalmyra={updatePalmyra} issueFor={issueFor} hasIssue={hasIssue} />}
      {hasHeaders && <HeadersGroup bo={bo} updatePalmyra={updatePalmyra} issueFor={issueFor} hasIssue={hasIssue} />}

      <Group id="validation" title="Validation" defaultOpen={issues.length > 0} count={issues.length || undefined} invalid={issues.some((i) => i.level === 'error')}>
        <ValidationList issues={issues} />
      </Group>
    </>
  );
}


function ContainerSection({ element, bo, update }: any) {
  const isPool = element.type === 'workflow:pool';
  const real = (c: any) => !c.waypoints && !c.labelTarget && c.width != null;
  const children = (element.children || []).filter(real);
  const lanes = children.filter((c: any) => c.type === 'workflow:lane');
  if (isPool) {
    const elements = children.length - lanes.length + lanes.reduce((n: number, l: any) => n + (l.children || []).filter(real).length, 0);
    return (
      <Group id="participant" title="Participant" defaultOpen>
        <TextField label="Process id" value={bo.processRef || ''} onChange={(v) => update({ processRef: v.trim() })} placeholder={`Process_${bo.id}`} help="Id of the process this participant executes" />
        <BooleanField label="Executable" value={bo.isExecutable === true || bo.isExecutable === 'true'} onChange={(v) => update({ isExecutable: v })} />
        <TextField label="Lanes" value={String(lanes.length)} readOnly />
        <TextField label="Elements" value={String(elements)} readOnly />
      </Group>
    );
  }
  return (
    <Group id="lane" title="Lane" defaultOpen>
      <TextField label="Participant" value={element.parent?.businessObject?.name || element.parent?.id || ''} readOnly />
      <TextField label="Elements" value={String(children.length)} readOnly />
    </Group>
  );
}

const present = (v: any) => v !== undefined && v !== null && String(v).trim() !== '';

function DynamicSection({ id, title, fields, bo, updatePath, issueFor }: { id: string; title: string; fields: PropertyField[]; bo: any; updatePath: (p: string, v: any) => void; issueFor: (f: string) => string | undefined }) {
  const palmyra = bo.palmyra || {};
  return (
    <Group id={id} title={title} dirty={fields.some((f) => present(readPath(palmyra, f.key)))} invalid={fields.some((f) => issueFor(f.key))}>
      {fields.map((field) => (
        <FieldFor key={field.key} field={field} value={readPath(palmyra, field.key)} onChange={(v) => updatePath(field.key, v)} error={issueFor(field.key)} />
      ))}
    </Group>
  );
}

function FieldFor({ field, value, onChange, error }: { field: PropertyField; value: any; onChange: (v: any) => void; error?: string }) {
  const common = { label: field.label, placeholder: field.placeholder, help: field.help, error, required: field.required };
  switch (field.type) {
    case 'boolean': return <BooleanField label={field.label} value={Boolean(value)} onChange={onChange} />;
    case 'textarea': return <TextAreaField {...common} value={String(value ?? '')} onChange={onChange} />;
    case 'select': return <SelectField label={field.label} help={field.help} error={error} value={String(value ?? '')} options={field.options || []} onChange={onChange} />;
    default: return <TextField {...common} value={String(value ?? '')} onChange={onChange} type={field.type === 'number' ? 'number' : 'text'} mono={field.type === 'expression' || field.type === 'duration'} />;
  }
}

function EventSection({ type, bo, updatePath }: any) {
  const eventDefinition = bo.eventDefinition || eventDefinitionForType(type);
  const read = (p: string) => readPath(bo.palmyra || {}, p) || '';
  return (
    <Group id="eventDefinition" title="Event definition" defaultOpen>
      <TextField label="Definition" value={eventDefinition} readOnly />
      {eventDefinition === 'timerEventDefinition' && (
        <>
          <TextField label="Duration" value={read('timer.duration')} onChange={(v) => updatePath('timer.duration', v)} placeholder="PT10M" help="ISO 8601 duration." mono />
          <TextField label="Date" value={read('timer.date')} onChange={(v) => updatePath('timer.date', v)} placeholder="2026-07-01T10:00:00Z" mono />
          <TextField label="Cycle" value={read('timer.cycle')} onChange={(v) => updatePath('timer.cycle', v)} placeholder="R5/PT10M" mono />
        </>
      )}
      {eventDefinition === 'messageEventDefinition' && <TextField label="Message name" value={read('message.name')} onChange={(v) => updatePath('message.name', v)} placeholder="Order Received" />}
      {eventDefinition === 'signalEventDefinition' && <TextField label="Signal name" value={read('signal.name')} onChange={(v) => updatePath('signal.name', v)} placeholder="PaymentCompleted" />}
      {eventDefinition === 'errorEventDefinition' && <TextField label="Error code" value={read('error.code')} onChange={(v) => updatePath('error.code', v)} placeholder="ERR-001" />}
    </Group>
  );
}

function GatewaySection({ bo, update }: any) {
  return (
    <Group id="gateway" title="Gateway" defaultOpen dirty={Boolean(bo.defaultFlow)}>
      <TextField label="Gateway type" value={bo.gatewayType || ''} readOnly />
      <TextField label="Default flow" value={bo.defaultFlow || ''} onChange={(v) => update({ defaultFlow: v })} placeholder="Flow ID" />
    </Group>
  );
}


interface ListSectionProps { bo: any; updatePalmyra: (key: string, value: any) => void; issueFor: (f: string) => string | undefined; hasIssue: (prefix: string) => boolean }

const MAPPING_FIELDS = [
  { key: 'source', label: 'Source', placeholder: '= customer.id', required: true },
  { key: 'target', label: 'Target', placeholder: 'customerId' },
];
const mappingSummary = (i: any) => `${i.source || '…'}  →  ${i.target || '…'}`;

function MappingGroups({ bo, updatePalmyra, issueFor, hasIssue }: ListSectionProps) {
  const live = () => bo.palmyra?.ioMapping || {};
  const mapping = live();
  const inputs = Array.isArray(mapping.inputs) ? mapping.inputs : [];
  const outputs = Array.isArray(mapping.outputs) ? mapping.outputs : [];
  const mode: string = mapping.outputMode || 'selected';

  const save = (next: { outputMode?: string; inputs?: any[]; outputs?: any[] }) => {
    const merged = { ...live(), ...next };
    const empty = !(merged.inputs || []).length && !(merged.outputs || []).length && (merged.outputMode || 'selected') === 'selected';
    updatePalmyra('ioMapping', empty ? undefined : merged);
  };

  return (
    <>
      <ListGroup
        id="mapping-inputs" title="Input mapping" itemName="input mapping" items={inputs} fields={MAPPING_FIELDS} summary={mappingSummary}
        invalid={hasIssue('ioMapping.inputs')} errorFor={(i, k) => issueFor(`ioMapping.inputs.${i}.${k}`)}
        onChange={(next) => save({ inputs: next })}
      />
      <ListGroup
        id="mapping-outputs" title="Output mapping" itemName="output mapping" items={outputs} fields={MAPPING_FIELDS} summary={mappingSummary}
        invalid={hasIssue('ioMapping.outputs') || Boolean(issueFor('ioMapping.outputMode'))} errorFor={(i, k) => issueFor(`ioMapping.outputs.${i}.${k}`)}
        disabledAdd={mode === 'all'}
        onChange={(next) => save({ outputs: next })}
      >
        <SelectField label="Output mode" value={mode} options={['selected', 'all']} error={issueFor('ioMapping.outputMode')} onChange={(v) => save({ outputMode: v })} />
      </ListGroup>
    </>
  );
}

function HeadersGroup({ bo, updatePalmyra, issueFor, hasIssue }: ListSectionProps) {
  const headers = Array.isArray(bo.palmyra?.taskHeaders?.headers) ? bo.palmyra.taskHeaders.headers : [];
  return (
    <ListGroup
      id="headers" title="Task headers" itemName="header" items={headers}
      fields={[{ key: 'key', label: 'Key', placeholder: 'x-api-key', required: true }, { key: 'value', label: 'Value', placeholder: 'value' }]}
      summary={(h: any) => `${h.key || '…'} = ${h.value || '…'}`}
      invalid={hasIssue('taskHeaders')} errorFor={(i, k) => issueFor(`taskHeaders.headers.${i}.${k}`)}
      onChange={(next) => updatePalmyra('taskHeaders', next.length ? { headers: next } : undefined)}
    />
  );
}

function ValidationList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return <div className="bpp-ok">✓ No property validation issues</div>;
  return (
    <div className="bpp-issues">
      {issues.map((i, n) => (
        <div key={n} className={`bpp-issue ${i.level}`}>
          <span className="bpp-issue-mark">{i.level === 'error' ? '!' : '⚠'}</span>
          <div>{i.message}</div>
        </div>
      ))}
    </div>
  );
}

function displayType(type: string) { return type.replace('workflow:', '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()); }
function eventDefinitionForType(type: string) {
  const m: any = { message: 'messageEventDefinition', timer: 'timerEventDefinition', signal: 'signalEventDefinition', error: 'errorEventDefinition', conditional: 'conditionalEventDefinition', escalation: 'escalationEventDefinition', compensation: 'compensateEventDefinition', link: 'linkEventDefinition', multiple: 'multipleEventDefinition', parallelMultiple: 'parallelMultipleEventDefinition', cancel: 'cancelEventDefinition', terminate: 'terminateEventDefinition' };
  const key = Object.keys(m).find((k) => type.includes(k));
  return key ? m[key] : '';
}
