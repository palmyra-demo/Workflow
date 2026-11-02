import { WorkflowType, categoryOf } from '../types';
import { defaultSize } from '../elementTemplates';
import { WorkflowGraph, GraphNode, GraphEdge } from './graph';

const BPMN = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC = 'http://www.omg.org/spec/DD/20100524/DC';
const DI = 'http://www.omg.org/spec/DD/20100524/DI';
const PALMYRA = 'urn:palmyra:bpmn:extensions:1.0';
const LEGACY = 'http://example.com/workflow';

const tagForType: Record<string, string> = {
  'workflow:startEvent': 'startEvent', 'workflow:endEvent': 'endEvent', 'workflow:intermediateEvent': 'intermediateCatchEvent', 'workflow:messageStartEvent': 'startEvent', 'workflow:messageIntermediateEvent': 'intermediateCatchEvent', 'workflow:messageEndEvent': 'endEvent', 'workflow:timerStartEvent': 'startEvent', 'workflow:timerIntermediateEvent': 'intermediateCatchEvent', 'workflow:timerEndEvent': 'endEvent', 'workflow:signalStartEvent': 'startEvent', 'workflow:signalIntermediateEvent': 'intermediateCatchEvent', 'workflow:signalEndEvent': 'endEvent', 'workflow:errorStartEvent': 'startEvent', 'workflow:errorEndEvent': 'endEvent', 'workflow:conditionalStartEvent': 'startEvent', 'workflow:conditionalIntermediateEvent': 'intermediateCatchEvent', 'workflow:escalationStartEvent': 'startEvent', 'workflow:escalationIntermediateEvent': 'intermediateCatchEvent', 'workflow:escalationEndEvent': 'endEvent', 'workflow:compensationIntermediateEvent': 'intermediateThrowEvent', 'workflow:compensationEndEvent': 'endEvent', 'workflow:linkIntermediateEvent': 'intermediateThrowEvent', 'workflow:multipleStartEvent': 'startEvent', 'workflow:multipleIntermediateEvent': 'intermediateCatchEvent', 'workflow:multipleEndEvent': 'endEvent', 'workflow:parallelMultipleStartEvent': 'startEvent', 'workflow:parallelMultipleIntermediateEvent': 'intermediateCatchEvent', 'workflow:parallelMultipleEndEvent': 'endEvent', 'workflow:cancelEndEvent': 'endEvent', 'workflow:terminateEndEvent': 'endEvent', 'workflow:task': 'task', 'workflow:userTask': 'userTask', 'workflow:serviceTask': 'serviceTask', 'workflow:manualTask': 'manualTask', 'workflow:scriptTask': 'scriptTask', 'workflow:businessRuleTask': 'businessRuleTask', 'workflow:sendTask': 'sendTask', 'workflow:receiveTask': 'receiveTask', 'workflow:subProcess': 'subProcess', 'workflow:adHocSubProcess': 'adHocSubProcess', 'workflow:callActivity': 'callActivity', 'workflow:transaction': 'transaction', 'workflow:exclusiveGateway': 'exclusiveGateway', 'workflow:parallelGateway': 'parallelGateway', 'workflow:inclusiveGateway': 'inclusiveGateway', 'workflow:eventBasedGateway': 'eventBasedGateway', 'workflow:complexGateway': 'complexGateway', 'workflow:dataObject': 'dataObjectReference', 'workflow:dataInput': 'dataInput', 'workflow:dataOutput': 'dataOutput', 'workflow:dataStore': 'dataStoreReference', 'workflow:pool': 'participant', 'workflow:lane': 'lane', 'workflow:group': 'group', 'workflow:textAnnotation': 'textAnnotation'
};
const eventDefForType: Record<string, string | undefined> = { 'workflow:messageStartEvent': 'messageEventDefinition', 'workflow:messageIntermediateEvent': 'messageEventDefinition', 'workflow:messageEndEvent': 'messageEventDefinition', 'workflow:timerStartEvent': 'timerEventDefinition', 'workflow:timerIntermediateEvent': 'timerEventDefinition', 'workflow:timerEndEvent': 'timerEventDefinition', 'workflow:signalStartEvent': 'signalEventDefinition', 'workflow:signalIntermediateEvent': 'signalEventDefinition', 'workflow:signalEndEvent': 'signalEventDefinition', 'workflow:errorStartEvent': 'errorEventDefinition', 'workflow:errorEndEvent': 'errorEventDefinition', 'workflow:conditionalStartEvent': 'conditionalEventDefinition', 'workflow:conditionalIntermediateEvent': 'conditionalEventDefinition', 'workflow:escalationStartEvent': 'escalationEventDefinition', 'workflow:escalationIntermediateEvent': 'escalationEventDefinition', 'workflow:escalationEndEvent': 'escalationEventDefinition', 'workflow:compensationIntermediateEvent': 'compensateEventDefinition', 'workflow:compensationEndEvent': 'compensateEventDefinition', 'workflow:linkIntermediateEvent': 'linkEventDefinition', 'workflow:multipleStartEvent': 'multipleEventDefinition', 'workflow:multipleIntermediateEvent': 'multipleEventDefinition', 'workflow:multipleEndEvent': 'multipleEventDefinition', 'workflow:parallelMultipleStartEvent': 'parallelMultipleEventDefinition', 'workflow:parallelMultipleIntermediateEvent': 'parallelMultipleEventDefinition', 'workflow:parallelMultipleEndEvent': 'parallelMultipleEventDefinition', 'workflow:cancelEndEvent': 'cancelEventDefinition', 'workflow:terminateEndEvent': 'terminateEventDefinition' };

const catOf = (t: string) => categoryOf(t as WorkflowType);
function esc(v: unknown) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function attrs(obj: Record<string, unknown>) { return Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}="${esc(v)}"`).join(' '); }
function childTag(name: string, a: Record<string, unknown>, indent: string, self = true, body = '') { return self ? `${indent}<palmyra:${name} ${attrs(a)} />` : `${indent}<palmyra:${name} ${attrs(a)}>${body}\n${indent}</palmyra:${name}>`; }
function extensionXml(n: GraphNode, indent = '        ') {
  const p: any = { ...(n.properties || {}), ...((n.properties as any)?.palmyra || {}) };
  const lines: string[] = [];
  const td = p.taskDefinition;
  if (td) lines.push(childTag('taskDefinition', td, indent));
  const sd = p.scriptDefinition;
  if (sd) lines.push(childTag('scriptDefinition', sd, indent));
  const ad = p.assignmentDefinition;
  if (ad) lines.push(childTag('assignmentDefinition', ad, indent));
  const ts = p.taskSchedule;
  if (ts) lines.push(childTag('taskSchedule', ts, indent));
  const fd = p.formDefinition;
  if (fd) lines.push(childTag('formDefinition', fd, indent));
  const ce = p.calledElement;
  if (ce) lines.push(childTag('calledElement', ce, indent));
  const ms = p.messageSubscription;
  if (ms) lines.push(childTag('messageSubscription', ms, indent));
  const mi = p.multiInstanceCollection;
  if (mi) lines.push(childTag('multiInstanceCollection', mi, indent));
  const br = p.businessRef;
  if (br) lines.push(childTag('businessRef', br, indent));
  const desc = p.taskDescription;
  if (desc) lines.push(childTag('taskDescription', desc, indent));
  const mapping = p.ioMapping;
  if (mapping) {
    const children = [...(Array.isArray(mapping.inputs) ? mapping.inputs : []).map((x: any) => childTag('input', { source: x.source, target: x.target }, indent + '  ')), ...(Array.isArray(mapping.outputs) ? mapping.outputs : []).map((x: any) => childTag('output', { source: x.source, target: x.target }, indent + '  '))].join('\n');
    lines.push(childTag('ioMapping', { outputMode: mapping.outputMode || 'selected' }, indent, false, children));
  }
  const headers = p.taskHeaders?.headers;
  if (Array.isArray(headers)) lines.push(childTag('taskHeaders', {}, indent, false, headers.map((h: any) => childTag('header', { key: h.key, value: h.value }, indent + '  ')).join('\n')));
  return lines.length ? `\n${indent}<bpmn:extensionElements>\n${lines.join('\n')}\n${indent}</bpmn:extensionElements>` : '';
}
function eventDefinitionXml(n: GraphNode, indent = '        ') {
  const d = eventDefForType[n.type];
  if (!d) return '';
  const t: any = n.properties?.timer || {};
  if (d === 'timerEventDefinition') {
    const children: string[] = [];
    if (t.duration) children.push(`${indent}  <bpmn:timeDuration>${esc(t.duration)}</bpmn:timeDuration>`);
    if (t.date) children.push(`${indent}  <bpmn:timeDate>${esc(t.date)}</bpmn:timeDate>`);
    if (t.cycle) children.push(`${indent}  <bpmn:timeCycle>${esc(t.cycle)}</bpmn:timeCycle>`);
    return children.length ? `\n${indent}<bpmn:${d}>\n${children.join('\n')}\n${indent}</bpmn:${d}>` : `\n${indent}<bpmn:${d} />`;
  }
  if (d === 'messageEventDefinition') return n.properties?.message?.name ? `\n${indent}<bpmn:${d} messageRef="Message_${esc(n.id)}" />` : `\n${indent}<bpmn:${d} />`;
  if (d === 'signalEventDefinition') return n.properties?.signal?.name ? `\n${indent}<bpmn:${d} signalRef="Signal_${esc(n.id)}" />` : `\n${indent}<bpmn:${d} />`;
  if (d === 'errorEventDefinition') return n.properties?.error?.code ? `\n${indent}<bpmn:${d} errorRef="Error_${esc(n.id)}" />` : `\n${indent}<bpmn:${d} />`;
  return `\n${indent}<bpmn:${d} />`;
}
function serializeNode(n: GraphNode, incoming: Map<string, string[]>, outgoing: Map<string, string[]>, inner = '') {
  if (n.type === 'workflow:textAnnotation') return `    <bpmn:textAnnotation ${attrs({ id: n.id })}>\n      <bpmn:text>${esc(n.name || '')}</bpmn:text>\n    </bpmn:textAnnotation>`;
  if (n.type === 'workflow:group') return `    <bpmn:group ${attrs({ id: n.id, categoryValueRef: n.name ? `CategoryValue_${n.id}` : undefined })} />`;
  const tag = tagForType[n.type] || 'task'; const a: any = { id: n.id, name: n.name }; if (n.type === 'workflow:boundaryEvent' && n.parent) a.attachedToRef = n.parent; const refs = [...(incoming.get(n.id) || []).map(id => `\n        <bpmn:incoming>${esc(id)}</bpmn:incoming>`), ...(outgoing.get(n.id) || []).map(id => `\n        <bpmn:outgoing>${esc(id)}</bpmn:outgoing>`)];
  const doc = n.properties?.documentation; const condition = n.type === 'workflow:sequenceFlow' ? n.properties?.conditionExpression : undefined;
  const children = `${doc ? `\n        <bpmn:documentation>${esc(doc)}</bpmn:documentation>` : ''}${condition ? `\n        <bpmn:conditionExpression>${esc(condition)}</bpmn:conditionExpression>` : ''}${eventDefinitionXml(n)}${refs.join('')}${extensionXml(n)}${inner ? '\n' + inner : ''}`;
  return children ? `    <bpmn:${tag} ${attrs(a)}>${children}\n    </bpmn:${tag}>` : `    <bpmn:${tag} ${attrs(a)} />`;
}
const isPoolN = (n?: GraphNode) => n?.type === 'workflow:pool';
const isLaneN = (n?: GraphNode) => n?.type === 'workflow:lane';
const isSubN = (n?: GraphNode) => n?.type === 'workflow:subProcess' || n?.type === 'workflow:adHocSubProcess' || n?.type === 'workflow:transaction';
const isCollapsedN = (n?: GraphNode) => isSubN(n) && (n?.properties as any)?.isExpanded === false;

export function serializeToXml(graph: WorkflowGraph): string {
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const parentOf = (n: GraphNode) => (n.parent ? byId.get(n.parent) : undefined);
  /** id of the pool / sub-process whose XML element owns `n` ('' = top level) */
  const containerOf = (n: GraphNode): string => { for (let p = parentOf(n), i = 0; p && i < 50; p = parentOf(p), i++) if (isPoolN(p) || isSubN(p)) return p.id; return ''; };
  const laneOf = (n: GraphNode): GraphNode | undefined => { for (let p = parentOf(n), i = 0; p && i < 50; p = parentOf(p), i++) { if (isLaneN(p)) return p; if (isPoolN(p) || isSubN(p)) return undefined; } return undefined; };

  const sequenceLike = graph.edges.filter(e => e.type !== 'workflow:messageFlow');
  const incoming = new Map<string, string[]>(), outgoing = new Map<string, string[]>();
  for (const e of graph.edges) { if (e.type !== 'workflow:sequenceFlow') continue; if (e.source) { const a = outgoing.get(e.source) || []; a.push(e.id); outgoing.set(e.source, a); } if (e.target) { const a = incoming.get(e.target) || []; a.push(e.id); incoming.set(e.target, a); } }

  const defsId = 'Definitions_1';
  const pools = graph.nodes.filter(isPoolN);
  const lanes = graph.nodes.filter(isLaneN);
  const messages = graph.nodes.filter(n => n.properties?.message?.name); const signals = graph.nodes.filter(n => n.properties?.signal?.name); const errors = graph.nodes.filter(n => n.properties?.error?.code);
  const groups = graph.nodes.filter(n => n.type === 'workflow:group' && n.name);
  const body = graph.nodes.filter(n => !isPoolN(n) && !isLaneN(n));

  const flowXml = (e: GraphEdge) => {
    const tag = e.type === 'workflow:messageFlow' ? 'messageFlow' : e.type === 'workflow:association' || e.type === 'workflow:dataAssociation' ? 'association' : 'sequenceFlow';
    const cond = e.type === 'workflow:sequenceFlow' && e.properties?.conditionExpression ? `\n      <bpmn:conditionExpression>${esc(e.properties.conditionExpression)}</bpmn:conditionExpression>` : '';
    return `    <bpmn:${tag} ${attrs({ id: e.id, name: e.name, sourceRef: e.source, targetRef: e.target })}>${cond}\n    </bpmn:${tag}>`;
  };
  /** nodes + flows owned by one container (process or sub-process) */
  const emitContainer = (containerId: string): string => {
    const items = body.filter(n => containerOf(n) === containerId).map(n => serializeNode(n, incoming, outgoing, isSubN(n) ? emitContainer(n.id) : ''));
    const flows = sequenceLike.filter(e => { const s = byId.get(e.source); return s && containerOf(s) === containerId; }).map(flowXml);
    return [...items, ...flows].join('\n');
  };
  const laneSetXml = (pool: GraphNode) => {
    const own = lanes.filter(l => l.parent === pool.id).sort((a, b) => a.y - b.y);
    if (!own.length) return '';
    const refs = (l: GraphNode) => body.filter(n => laneOf(n) === l && ['event', 'task', 'gateway'].includes(catOf(n.type))).map(n => `\n        <bpmn:flowNodeRef>${esc(n.id)}</bpmn:flowNodeRef>`).join('');
    return `\n    <bpmn:laneSet id="LaneSet_${esc(pool.id)}">\n${own.map(l => `      <bpmn:lane ${attrs({ id: l.id, name: l.name })}>${refs(l)}\n      </bpmn:lane>`).join('\n')}\n    </bpmn:laneSet>`;
  };

  const processes: string[] = [];
  const processIdOf = (p: GraphNode) => String((p.properties as any)?.processRef || `Process_${p.id}`);
  const executable = (p?: GraphNode) => ((p?.properties as any)?.isExecutable === true || (p?.properties as any)?.isExecutable === 'true') ? 'true' : 'false';
  for (const pool of pools) processes.push(`  <bpmn:process id="${esc(processIdOf(pool))}" isExecutable="${executable(pool)}">${laneSetXml(pool)}\n${emitContainer(pool.id)}\n  </bpmn:process>`);
  const rootXml = emitContainer('');
  if (!pools.length || rootXml) processes.unshift(`  <bpmn:process id="Process_1" isExecutable="false">\n${rootXml}\n  </bpmn:process>`);

  const messageFlows = graph.edges.filter(e => e.type === 'workflow:messageFlow').map(flowXml).join('\n');
  const collaboration = pools.length ? `\n  <bpmn:collaboration id="Collaboration_1">\n${pools.map(p => { const doc = p.properties?.documentation; const a = attrs({ id: p.id, name: p.name, processRef: processIdOf(p) }); return doc ? `    <bpmn:participant ${a}>\n      <bpmn:documentation>${esc(doc)}</bpmn:documentation>\n    </bpmn:participant>` : `    <bpmn:participant ${a} />`; }).join('\n')}${messageFlows ? '\n' + messageFlows : ''}\n  </bpmn:collaboration>` : '';

  const horizontal = (n: GraphNode) => (isPoolN(n) || isLaneN(n)) ? ' isHorizontal="true"' : '';
  const expandedAttr = (n: GraphNode) => isSubN(n) ? ` isExpanded="${isCollapsedN(n) ? 'false' : 'true'}"` : '';
  const depth = (n: GraphNode) => { let d = 0; for (let p = parentOf(n); p && d < 50; p = parentOf(p)) d++; return d; };
  /** the plane a node is drawn on: the nearest collapsed sub-process above it ('' = the main plane) – content of a collapsed sub-process lives on its own plane, as in bpmn.io / Camunda Modeler */
  const planeOf = (n: GraphNode): string => { for (let p = parentOf(n), i = 0; p && i < 50; p = parentOf(p), i++) if (isCollapsedN(p)) return p.id; return ''; };
  const shapeDi = (n: GraphNode) => `      <bpmndi:BPMNShape id="${esc(n.id)}_di" bpmnElement="${esc(n.id)}"${horizontal(n)}${expandedAttr(n)}>\n        <dc:Bounds ${attrs({ x: n.x, y: n.y, width: n.width, height: n.height })} />${n.label ? `\n        <bpmndi:BPMNLabel>\n          <dc:Bounds ${attrs({ x: n.label.x, y: n.label.y, width: n.label.width, height: n.label.height })} />\n        </bpmndi:BPMNLabel>` : ''}\n      </bpmndi:BPMNShape>`;
  const edgeDi = (e: GraphEdge) => `      <bpmndi:BPMNEdge id="${esc(e.id)}_di" bpmnElement="${esc(e.id)}">\n${(e.waypoints || []).map(p => `        <di:waypoint ${attrs(p)} />`).join('\n')}${e.label ? `\n        <bpmndi:BPMNLabel>\n          <dc:Bounds ${attrs({ x: e.label.x, y: e.label.y, width: e.label.width, height: e.label.height })} />\n        </bpmndi:BPMNLabel>` : ''}\n      </bpmndi:BPMNEdge>`;
  const ordered = graph.nodes.map((n, i) => ({ n, i })).sort((a, b) => depth(a.n) - depth(b.n) || a.i - b.i).map(({ n }) => n);
  const planeOfEdge = (e: GraphEdge) => { const s = byId.get(e.source); return s ? planeOf(s) : ''; };
  const planeXml = (diagramId: string, planeId: string, bpmnElement: string, owner: string) =>
    `  <bpmndi:BPMNDiagram id="${diagramId}">\n    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${esc(bpmnElement)}">\n${[...ordered.filter(n => planeOf(n) === owner).map(shapeDi), ...graph.edges.filter(e => planeOfEdge(e) === owner).map(edgeDi)].join('\n')}\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>`;
  const plane = pools.length ? 'Collaboration_1' : 'Process_1';
  const collapsedPlanes = graph.nodes.filter(isCollapsedN).filter(n => graph.nodes.some(c => c.parent === n.id)).map((n, i) => planeXml(`BPMNDiagram_${i + 2}`, `${n.id}_plane`, n.id, n.id)).join('\n');
  const diagrams = planeXml('BPMNDiagram_1', 'BPMNPlane_1', plane, '') + (collapsedPlanes ? '\n' + collapsedPlanes : '');
  const definitions = [...messages.map(n => `  <bpmn:message id="Message_${esc(n.id)}" name="${esc(n.properties?.message?.name)}" />`), ...signals.map(n => `  <bpmn:signal id="Signal_${esc(n.id)}" name="${esc(n.properties?.signal?.name)}" />`), ...errors.map(n => `  <bpmn:error id="Error_${esc(n.id)}" errorCode="${esc(n.properties?.error?.code)}" />`), ...groups.map(n => `  <bpmn:category id="Category_${esc(n.id)}">\n    <bpmn:categoryValue id="CategoryValue_${esc(n.id)}" value="${esc(n.name)}" />\n  </bpmn:category>`)].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="${BPMN}" xmlns:bpmndi="${BPMNDI}" xmlns:dc="${DC}" xmlns:di="${DI}" xmlns:palmyra="${PALMYRA}" xmlns:workflow="${LEGACY}" id="${defsId}" targetNamespace="${PALMYRA}" exporter="Palmyra Custom BPMN Workflow Editor" exporterVersion="1.1">${definitions ? '\n' + definitions : ''}${collaboration}\n${processes.join('\n')}\n${diagrams}\n</bpmn:definitions>`;
}
function local(el: Element) { return el.localName || el.tagName.split(':').pop() || ''; }
function child(el: Element, name: string) { return Array.from(el.children).find(c => local(c) === name) || null; }
function children(el: Element, name: string) { return Array.from(el.children).filter(c => local(c) === name); }
function extension(el: Element) { return Array.from(el.children).find(c => local(c) === 'extensionElements') || null; }
function readExtensions(el: Element) {
  const out: any = {}; const ex = extension(el); if (!ex) return out;
  const get = (n: string) => children(ex, n)[0]; const attrsObj = (n: string) => { const e = get(n); if (!e) return undefined; const a: any = {}; for (const at of Array.from(e.attributes)) a[at.name] = at.value; return a; };
  for (const n of ['taskDefinition', 'scriptDefinition', 'assignmentDefinition', 'taskSchedule', 'formDefinition', 'calledElement', 'messageSubscription', 'multiInstanceCollection', 'businessRef', 'taskDescription']) { const a = attrsObj(n); if (a) out[n] = a; }
  const map = get('ioMapping'); if (map) { out.ioMapping = { outputMode: map.getAttribute('outputMode') || 'selected', inputs: children(map, 'input').map(x => ({ source: x.getAttribute('source') || '', target: x.getAttribute('target') || '' })), outputs: children(map, 'output').map(x => ({ source: x.getAttribute('source') || '', target: x.getAttribute('target') || '' })) }; }
  const headers = get('taskHeaders'); if (headers) out.taskHeaders = { headers: children(headers, 'header').map(x => ({ key: x.getAttribute('key') || '', value: x.getAttribute('value') || '' })) };
  for (const n of ['timerConfiguration', 'messageConfiguration', 'signalConfiguration', 'errorConfiguration']) { const a = attrsObj(n); if (a) out[n.replace('Configuration', '')] = n === 'errorConfiguration' ? { code: a.code || '' } : a; }
  const cp = get('customProperties'); if (cp) { out.customProperties = {}; for (const p of children(cp, 'property')) { const k = p.getAttribute('key'); if (k) out.customProperties[k] = p.getAttribute('value') || ''; } }
  const legacy = Array.from(el.getElementsByTagNameNS(LEGACY, 'properties'))[0]; if (legacy) { out.customProperties = { ...(out.customProperties || {}) }; for (const p of Array.from(legacy.getElementsByTagNameNS(LEGACY, 'property'))) { const k = p.getAttribute('key'); if (k) out.customProperties[k] = p.getAttribute('value') || ''; } }
  return out;
}
function typeFromBpmn(el: Element): WorkflowType | undefined { const tag = local(el); const def = Array.from(el.children).find(c => local(c).endsWith('EventDefinition')); const d = def ? local(def) : ''; if (tag === 'startEvent') { const m: any = { messageEventDefinition: 'workflow:messageStartEvent', timerEventDefinition: 'workflow:timerStartEvent', signalEventDefinition: 'workflow:signalStartEvent', errorEventDefinition: 'workflow:errorStartEvent', conditionalEventDefinition: 'workflow:conditionalStartEvent', escalationEventDefinition: 'workflow:escalationStartEvent', multipleEventDefinition: 'workflow:multipleStartEvent', parallelMultipleEventDefinition: 'workflow:parallelMultipleStartEvent' }; return m[d] || 'workflow:startEvent'; } if (tag === 'endEvent') { const m: any = { messageEventDefinition: 'workflow:messageEndEvent', timerEventDefinition: 'workflow:timerEndEvent', signalEventDefinition: 'workflow:signalEndEvent', errorEventDefinition: 'workflow:errorEndEvent', escalationEventDefinition: 'workflow:escalationEndEvent', compensateEventDefinition: 'workflow:compensationEndEvent', multipleEventDefinition: 'workflow:multipleEndEvent', parallelMultipleEventDefinition: 'workflow:parallelMultipleEndEvent', cancelEventDefinition: 'workflow:cancelEndEvent', terminateEventDefinition: 'workflow:terminateEndEvent' }; return m[d] || 'workflow:endEvent'; } if (tag === 'intermediateCatchEvent' || tag === 'intermediateThrowEvent') { const m: any = { messageEventDefinition: 'workflow:messageIntermediateEvent', timerEventDefinition: 'workflow:timerIntermediateEvent', signalEventDefinition: 'workflow:signalIntermediateEvent', conditionalEventDefinition: 'workflow:conditionalIntermediateEvent', escalationEventDefinition: 'workflow:escalationIntermediateEvent', compensateEventDefinition: 'workflow:compensationIntermediateEvent', linkEventDefinition: 'workflow:linkIntermediateEvent', multipleEventDefinition: 'workflow:multipleIntermediateEvent', parallelMultipleEventDefinition: 'workflow:parallelMultipleIntermediateEvent' }; return m[d] || 'workflow:intermediateEvent'; } const map: any = { boundaryEvent: 'workflow:boundaryEvent', task: 'workflow:task', userTask: 'workflow:userTask', serviceTask: 'workflow:serviceTask', manualTask: 'workflow:manualTask', scriptTask: 'workflow:scriptTask', businessRuleTask: 'workflow:businessRuleTask', sendTask: 'workflow:sendTask', receiveTask: 'workflow:receiveTask', subProcess: 'workflow:subProcess', adHocSubProcess: 'workflow:adHocSubProcess', callActivity: 'workflow:callActivity', transaction: 'workflow:transaction', exclusiveGateway: 'workflow:exclusiveGateway', parallelGateway: 'workflow:parallelGateway', inclusiveGateway: 'workflow:inclusiveGateway', eventBasedGateway: 'workflow:eventBasedGateway', complexGateway: 'workflow:complexGateway', dataObjectReference: 'workflow:dataObject', dataObject: 'workflow:dataObject', dataInput: 'workflow:dataInput', dataOutput: 'workflow:dataOutput', dataStoreReference: 'workflow:dataStore', participant: 'workflow:pool', lane: 'workflow:lane', group: 'workflow:group', textAnnotation: 'workflow:textAnnotation' }; return map[tag]; }
export function parseXml(xml: string): WorkflowGraph {
  const doc = new DOMParser().parseFromString(xml, 'application/xml'); if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid BPMN XML'); const nodes: GraphNode[] = []; const edges: GraphEdge[] = []; const elOf = new Map<string, Element>(); const labelById = new Map<string, { x: number; y: number; width: number; height: number }>(); const diById = new Map<string, Element>(); const expandedById = new Map<string, string | null>(); for (const s of Array.from(doc.getElementsByTagNameNS(BPMNDI, 'BPMNShape'))) { expandedById.set(s.getAttribute('bpmnElement') || '', s.getAttribute('isExpanded')); const b = Array.from(s.getElementsByTagNameNS(DC, 'Bounds'))[0]; if (b) diById.set(s.getAttribute('bpmnElement') || '', b); const lbl = Array.from(s.getElementsByTagNameNS(BPMNDI, 'BPMNLabel'))[0]; const lb = lbl ? Array.from(lbl.getElementsByTagNameNS(DC, 'Bounds'))[0] : undefined; if (lb) labelById.set(s.getAttribute('bpmnElement') || '', { x: Number(lb.getAttribute('x') || 0), y: Number(lb.getAttribute('y') || 0), width: Number(lb.getAttribute('width') || 0), height: Number(lb.getAttribute('height') || 0) }); } for (const e of Array.from(doc.getElementsByTagNameNS(BPMN, '*'))) { const type = typeFromBpmn(e); if (!type) continue; const id = e.getAttribute('id') || ''; const b = diById.get(id); const extensions: any = readExtensions(e); const p: any = { palmyra: extensions }; const docEl = child(e, 'documentation'); if (docEl) p.documentation = docEl.textContent || ''; const def = Array.from(e.children).find(c => local(c).endsWith('EventDefinition')); if (def) { const d = local(def); if (d === 'timerEventDefinition') p.palmyra.timer = { duration: def.getAttribute('duration') || '', date: def.getAttribute('timeDate') || '', cycle: def.getAttribute('timeCycle') || '', ...p.palmyra.timer }; if (d === 'messageEventDefinition') { const ref = def.getAttribute('messageRef'); const m = ref ? Array.from(doc.getElementsByTagNameNS(BPMN, 'message')).find(x => x.getAttribute('id') === ref) : null; if (m) p.palmyra.message = { name: m.getAttribute('name') || '', ...p.palmyra.message }; } if (d === 'signalEventDefinition') { const ref = def.getAttribute('signalRef'); const m = ref ? Array.from(doc.getElementsByTagNameNS(BPMN, 'signal')).find(x => x.getAttribute('id') === ref) : null; if (m) p.palmyra.signal = { name: m.getAttribute('name') || '', ...p.palmyra.signal }; } if (d === 'errorEventDefinition') { const ref = def.getAttribute('errorRef'); const m = ref ? Array.from(doc.getElementsByTagNameNS(BPMN, 'error')).find(x => x.getAttribute('id') === ref) : null; if (m) p.palmyra.error = { code: m?.getAttribute('errorCode') || '', ...p.palmyra.error }; } } const tagName = local(e); let nodeName: string | undefined = e.getAttribute('name') || undefined; if (tagName === 'textAnnotation') nodeName = child(e, 'text')?.textContent || undefined; if (tagName === 'group') { const ref = e.getAttribute('categoryValueRef'); const cv = ref ? Array.from(doc.getElementsByTagNameNS(BPMN, 'categoryValue')).find(x => x.getAttribute('id') === ref) : null; nodeName = cv?.getAttribute('value') || nodeName; } if (tagName === 'participant') { const procId = e.getAttribute('processRef'); const proc = procId ? Array.from(doc.getElementsByTagNameNS(BPMN, 'process')).find(x => x.getAttribute('id') === procId) : null; if (procId) p.processRef = procId; if (proc?.getAttribute('isExecutable')) p.isExecutable = proc.getAttribute('isExecutable') === 'true'; } if (tagName === 'subProcess' || tagName === 'adHocSubProcess' || tagName === 'transaction') { const attr = expandedById.get(id); const root = doc.documentElement; const ours = root.getAttribute('exporter') === 'Palmyra Custom BPMN Workflow Editor' && root.getAttribute('exporterVersion') === '1.0'; if (attr === 'false' || (attr == null && !ours)) p.isExpanded = false; } const dflt = defaultSize(type); elOf.set(id, e); nodes.push({ id, type, name: nodeName, x: Number(b?.getAttribute('x') || 0), y: Number(b?.getAttribute('y') || 0), width: Number(b?.getAttribute('width') || dflt.width || 40), height: Number(b?.getAttribute('height') || dflt.height || 40), ...(labelById.get(id) ? { label: labelById.get(id) } : {}), properties: p }); }
  // nesting: participant -> lane -> flow node, sub-process -> children, host task -> boundary events
  const processes = Array.from(doc.getElementsByTagNameNS(BPMN, 'process'));
  const participantOfProcess = new Map<string, string>();
  for (const n of nodes) { if (n.type === 'workflow:pool') { const ref = (n.properties as any)?.processRef; if (ref) participantOfProcess.set(ref, n.id); } }
  const laneOfNode = new Map<string, string>();
  for (const l of Array.from(doc.getElementsByTagNameNS(BPMN, 'lane'))) for (const r of Array.from(l.getElementsByTagNameNS(BPMN, 'flowNodeRef'))) { const ref = (r.textContent || '').trim(); if (ref) laneOfNode.set(ref, l.getAttribute('id') || ''); }
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const n of nodes) {
    const el = elOf.get(n.id); if (!el || n.type === 'workflow:pool') continue;
    const tag = local(el);
    const proc = processes.find(pr => pr.contains(el));
    const pool = proc ? participantOfProcess.get(proc.getAttribute('id') || '') : undefined;
    if (tag === 'lane') { if (pool) n.parent = pool; continue; }
    if (tag === 'boundaryEvent') { const host = el.getAttribute('attachedToRef') || ''; if (nodeIds.has(host)) { n.parent = host; continue; } }
    const owner = el.parentElement; const ownerTag = owner ? local(owner) : '';
    if ((ownerTag === 'subProcess' || ownerTag === 'adHocSubProcess' || ownerTag === 'transaction') && owner && nodeIds.has(owner.getAttribute('id') || '')) { n.parent = owner.getAttribute('id') || undefined; continue; }
    const lane = laneOfNode.get(n.id);
    if (lane && nodeIds.has(lane)) n.parent = lane; else if (pool) n.parent = pool;
  }
  for (const e of Array.from(doc.getElementsByTagNameNS(BPMN, '*'))) { const tag = local(e); const type: WorkflowType | undefined = tag === 'sequenceFlow' ? 'workflow:sequenceFlow' : tag === 'messageFlow' ? 'workflow:messageFlow' : tag === 'association' ? 'workflow:association' : undefined; if (!type) continue; const id = e.getAttribute('id') || ''; const edgeDi = Array.from(doc.getElementsByTagNameNS(BPMNDI, 'BPMNEdge')).find(d => d.getAttribute('bpmnElement') === id); const waypoints = Array.from(edgeDi?.getElementsByTagNameNS(DI, 'waypoint') || []).map(w => ({ x: Number(w.getAttribute('x') || 0), y: Number(w.getAttribute('y') || 0) })); const props: any = { ...readExtensions(e) }; const cond = child(e, 'conditionExpression'); if (cond) props.conditionExpression = cond.textContent || ''; const elb = edgeDi ? Array.from(edgeDi.getElementsByTagNameNS(BPMNDI, 'BPMNLabel'))[0] : undefined; const elbb = elb ? Array.from(elb.getElementsByTagNameNS(DC, 'Bounds'))[0] : undefined; edges.push({ id, type, name: e.getAttribute('name') || undefined, source: e.getAttribute('sourceRef') || '', target: e.getAttribute('targetRef') || '', waypoints, ...(elbb ? { label: { x: Number(elbb.getAttribute('x') || 0), y: Number(elbb.getAttribute('y') || 0), width: Number(elbb.getAttribute('width') || 0), height: Number(elbb.getAttribute('height') || 0) } } : {}), properties: props }); }
  const nodeMap = new Map(nodes.map(n => [n.id, n])); for (const e of edges) { const s = nodeMap.get(e.source), t = nodeMap.get(e.target); if (s && t) { if (s.type === 'workflow:pool' || s.type === 'workflow:lane') { } } } return { nodes, edges };
}
