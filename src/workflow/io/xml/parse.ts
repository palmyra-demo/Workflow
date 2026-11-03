import { WorkflowType } from '../../types';
import { defaultSize } from '../../elementTemplates';
import { GraphEdge, GraphNode, WorkflowGraph } from '../graph';
import {
  BOOLEAN_ATTRIBUTES,
  BPMNDI_NS,
  BPMN_NS,
  DC_NS,
  DI_NS,
  END_EVENT_BY_DEFINITION,
  EXPORTER_NAME,
  INTERMEDIATE_EVENT_BY_DEFINITION,
  LEGACY_EXPORTER_VERSION,
  LEGACY_NS,
  SIMPLE_EXTENSIONS,
  START_EVENT_BY_DEFINITION,
  SUB_PROCESS_TAGS,
  TYPE_BY_TAG,
} from './constants';

type Props = Record<string, any>;
type Box = { x: number; y: number; width: number; height: number };

const localName = (el: Element) => el.localName || el.tagName.split(':').pop() || '';
const childrenNamed = (el: Element, name: string) =>
  Array.from(el.children).filter((c) => localName(c) === name);
const childNamed = (el: Element, name: string) => childrenNamed(el, name)[0] || null;
const firstByTag = (el: Element | Document, ns: string, name: string) =>
  el.getElementsByTagNameNS(ns, name)[0];
const allByTag = (el: Element | Document, ns: string, name: string) =>
  Array.from(el.getElementsByTagNameNS(ns, name));
const findById = (elements: Element[], id: string | null) =>
  id ? elements.find((el) => el.getAttribute('id') === id) || null : null;

const numberAttr = (el: Element | undefined, name: string, fallback = 0) =>
  Number(el?.getAttribute(name) || fallback);
const boxOf = (bounds: Element): Box => ({
  x: numberAttr(bounds, 'x'),
  y: numberAttr(bounds, 'y'),
  width: numberAttr(bounds, 'width'),
  height: numberAttr(bounds, 'height'),
});

function eventDefinitionOf(el: Element) {
  return Array.from(el.children).find((c) => localName(c).endsWith('EventDefinition'));
}

function typeFromBpmn(el: Element): WorkflowType | undefined {
  const tag = localName(el);
  const definition = eventDefinitionOf(el);
  const definitionName = definition ? localName(definition) : '';

  if (tag === 'startEvent')
    return (START_EVENT_BY_DEFINITION[definitionName] || 'workflow:startEvent') as WorkflowType;
  if (tag === 'endEvent')
    return (END_EVENT_BY_DEFINITION[definitionName] || 'workflow:endEvent') as WorkflowType;
  if (tag === 'intermediateCatchEvent' || tag === 'intermediateThrowEvent') {
    return (INTERMEDIATE_EVENT_BY_DEFINITION[definitionName] || 'workflow:intermediateEvent') as WorkflowType;
  }
  return TYPE_BY_TAG[tag] as WorkflowType | undefined;
}

function readAttributes(el: Element, name: string): Props | undefined {
  const target = el.firstElementChild && childNamed(el, name);
  if (!target) return undefined;

  const result: Props = {};
  for (const attribute of Array.from(target.attributes)) {
    const isBoolean =
      BOOLEAN_ATTRIBUTES.includes(attribute.name) && ['true', 'false'].includes(attribute.value);
    result[attribute.name] = isBoolean ? attribute.value === 'true' : attribute.value;
  }
  return result;
}

const readPairs = (parent: Element, name: string, first: string, second: string) =>
  childrenNamed(parent, name).map((item) => ({
    [first]: item.getAttribute(first) || '',
    [second]: item.getAttribute(second) || '',
  }));

function readProperties(container: Element): Record<string, string> {
  const result: Record<string, string> = {};
  for (const property of Array.from(container.getElementsByTagNameNS(LEGACY_NS, 'property'))) {
    const key = property.getAttribute('key');
    if (key) result[key] = property.getAttribute('value') || '';
  }
  return result;
}

function readExtensions(el: Element): Props {
  const result: Props = {};
  const extensions = childNamed(el, 'extensionElements');
  if (!extensions) return result;

  const find = (name: string) => childNamed(extensions, name);

  for (const name of SIMPLE_EXTENSIONS) {
    const values = readAttributes(extensions, name);
    if (values) result[name] = values;
  }

  const ioMapping = find('ioMapping');
  if (ioMapping) {
    result.ioMapping = {
      outputMode: ioMapping.getAttribute('outputMode') || 'selected',
      inputs: readPairs(ioMapping, 'input', 'source', 'target'),
      outputs: readPairs(ioMapping, 'output', 'source', 'target'),
    };
  }

  const taskHeaders = find('taskHeaders');
  if (taskHeaders) result.taskHeaders = { headers: readPairs(taskHeaders, 'header', 'key', 'value') };

  for (const name of ['timer', 'message', 'signal', 'error']) {
    const values = readAttributes(extensions, `${name}Configuration`);
    if (values) result[name] = name === 'error' ? { code: values.code || '' } : values;
  }

  const customProperties = find('customProperties');
  if (customProperties) {
    result.customProperties = {};
    for (const property of childrenNamed(customProperties, 'property')) {
      const key = property.getAttribute('key');
      if (key) result.customProperties[key] = property.getAttribute('value') || '';
    }
  }

  const legacy = firstByTag(el, LEGACY_NS, 'properties');
  if (legacy) result.customProperties = { ...(result.customProperties || {}), ...readProperties(legacy) };

  return result;
}

function readDiagramInfo(doc: Document) {
  const bounds = new Map<string, Element>();
  const labels = new Map<string, Box>();
  const expanded = new Map<string, string | null>();

  for (const shape of allByTag(doc, BPMNDI_NS, 'BPMNShape')) {
    const id = shape.getAttribute('bpmnElement') || '';
    expanded.set(id, shape.getAttribute('isExpanded'));

    const shapeBounds = firstByTag(shape, DC_NS, 'Bounds');
    if (shapeBounds) bounds.set(id, shapeBounds);

    const label = firstByTag(shape, BPMNDI_NS, 'BPMNLabel');
    const labelBounds = label && firstByTag(label, DC_NS, 'Bounds');
    if (labelBounds) labels.set(id, boxOf(labelBounds));
  }
  return { bounds, labels, expanded };
}

function applyEventDefinitionData(doc: Document, el: Element, config: Props) {
  const definition = eventDefinitionOf(el);
  if (!definition) return;

  const name = localName(definition);
  const referenced = (tag: string, refAttribute: string) =>
    findById(allByTag(doc, BPMN_NS, tag), definition.getAttribute(refAttribute));

  if (name === 'timerEventDefinition') {
    const text = (child: string, legacyAttribute: string) =>
      childNamed(definition, child)?.textContent?.trim() || definition.getAttribute(legacyAttribute) || '';
    config.timer = {
      duration: text('timeDuration', 'duration'),
      date: text('timeDate', 'timeDate'),
      cycle: text('timeCycle', 'timeCycle'),
      ...config.timer,
    };
  }
  if (name === 'messageEventDefinition') {
    const message = referenced('message', 'messageRef');
    if (message) config.message = { name: message.getAttribute('name') || '', ...config.message };
  }
  if (name === 'signalEventDefinition') {
    const signal = referenced('signal', 'signalRef');
    if (signal) config.signal = { name: signal.getAttribute('name') || '', ...config.signal };
  }
  if (name === 'errorEventDefinition') {
    const error = referenced('error', 'errorRef');
    if (error) config.error = { code: error.getAttribute('errorCode') || '', ...config.error };
  }
}

function readNodes(doc: Document) {
  const { bounds, labels, expanded } = readDiagramInfo(doc);
  const root = doc.documentElement;
  const isOurLegacyFile =
    root.getAttribute('exporter') === EXPORTER_NAME &&
    root.getAttribute('exporterVersion') === LEGACY_EXPORTER_VERSION;

  const nodes: GraphNode[] = [];
  const elements = new Map<string, Element>();

  for (const el of allByTag(doc, BPMN_NS, '*')) {
    const type = typeFromBpmn(el);
    if (!type) continue;

    const id = el.getAttribute('id') || '';
    const tag = localName(el);
    const box = bounds.get(id);
    const config = readExtensions(el);
    const properties: Props = { palmyra: config };

    const documentation = childNamed(el, 'documentation');
    if (documentation) properties.documentation = documentation.textContent || '';

    applyEventDefinitionData(doc, el, config);

    let name: string | undefined = el.getAttribute('name') || undefined;
    if (tag === 'textAnnotation') name = childNamed(el, 'text')?.textContent || undefined;
    if (tag === 'group') {
      const categoryValue = findById(
        allByTag(doc, BPMN_NS, 'categoryValue'),
        el.getAttribute('categoryValueRef'),
      );
      name = categoryValue?.getAttribute('value') || name;
    }
    if (tag === 'participant') {
      const processId = el.getAttribute('processRef');
      const process = findById(allByTag(doc, BPMN_NS, 'process'), processId);
      if (processId) properties.processRef = processId;
      if (process?.getAttribute('isExecutable'))
        properties.isExecutable = process.getAttribute('isExecutable') === 'true';
    }
    if (SUB_PROCESS_TAGS.includes(tag)) {
      const attribute = expanded.get(id);
      if (attribute === 'false' || (attribute == null && !isOurLegacyFile)) properties.isExpanded = false;
    }

    const fallback = defaultSize(type);
    const label = labels.get(id);
    elements.set(id, el);
    nodes.push({
      id,
      type,
      name,
      x: numberAttr(box, 'x'),
      y: numberAttr(box, 'y'),
      width: numberAttr(box, 'width', fallback.width || 40),
      height: numberAttr(box, 'height', fallback.height || 40),
      ...(label ? { label } : {}),
      properties,
    });
  }
  return { nodes, elements };
}

function assignParents(doc: Document, nodes: GraphNode[], elements: Map<string, Element>) {
  const processes = allByTag(doc, BPMN_NS, 'process');
  const nodeIds = new Set(nodes.map((n) => n.id));

  const poolByProcess = new Map<string, string>();
  for (const node of nodes) {
    const processRef = node.properties?.processRef;
    if (node.type === 'workflow:pool' && processRef) poolByProcess.set(processRef, node.id);
  }

  const laneByNode = new Map<string, string>();
  for (const lane of allByTag(doc, BPMN_NS, 'lane')) {
    for (const ref of allByTag(lane, BPMN_NS, 'flowNodeRef')) {
      const nodeId = (ref.textContent || '').trim();
      if (nodeId) laneByNode.set(nodeId, lane.getAttribute('id') || '');
    }
  }

  for (const node of nodes) {
    const el = elements.get(node.id);
    if (!el || node.type === 'workflow:pool') continue;

    const tag = localName(el);
    const process = processes.find((p) => p.contains(el));
    const pool = process ? poolByProcess.get(process.getAttribute('id') || '') : undefined;

    if (tag === 'lane') {
      if (pool) node.parent = pool;
      continue;
    }

    if (tag === 'boundaryEvent') {
      const host = el.getAttribute('attachedToRef') || '';
      if (nodeIds.has(host)) {
        node.parent = host;
        continue;
      }
    }

    const owner = el.parentElement;
    const ownerId = owner?.getAttribute('id') || '';
    if (owner && SUB_PROCESS_TAGS.includes(localName(owner)) && nodeIds.has(ownerId)) {
      node.parent = ownerId;
      continue;
    }

    const lane = laneByNode.get(node.id);
    if (lane && nodeIds.has(lane)) node.parent = lane;
    else if (pool) node.parent = pool;
  }
}

const EDGE_TYPE_BY_TAG: Record<string, WorkflowType> = {
  sequenceFlow: 'workflow:sequenceFlow',
  messageFlow: 'workflow:messageFlow',
  association: 'workflow:association',
};

function readEdges(doc: Document): GraphEdge[] {
  const diagramEdges = allByTag(doc, BPMNDI_NS, 'BPMNEdge');
  const edges: GraphEdge[] = [];

  for (const el of allByTag(doc, BPMN_NS, '*')) {
    const type = EDGE_TYPE_BY_TAG[localName(el)];
    if (!type) continue;

    const id = el.getAttribute('id') || '';
    const edgeDi = diagramEdges.find((d) => d.getAttribute('bpmnElement') === id);
    const waypoints = edgeDi
      ? allByTag(edgeDi, DI_NS, 'waypoint').map((w) => ({ x: numberAttr(w, 'x'), y: numberAttr(w, 'y') }))
      : [];

    const properties: Props = { ...readExtensions(el) };
    const condition = childNamed(el, 'conditionExpression');
    if (condition) properties.conditionExpression = condition.textContent || '';

    const label = edgeDi && firstByTag(edgeDi, BPMNDI_NS, 'BPMNLabel');
    const labelBounds = label && firstByTag(label, DC_NS, 'Bounds');

    edges.push({
      id,
      type,
      name: el.getAttribute('name') || undefined,
      source: el.getAttribute('sourceRef') || '',
      target: el.getAttribute('targetRef') || '',
      waypoints,
      ...(labelBounds ? { label: boxOf(labelBounds) } : {}),
      properties,
    });
  }
  return edges;
}

export function parseXml(xml: string): WorkflowGraph {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid BPMN XML');

  const { nodes, elements } = readNodes(doc);
  assignParents(doc, nodes, elements);
  return { nodes, edges: readEdges(doc) };
}
