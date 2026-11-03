import { GraphEdge, GraphNode, WorkflowGraph } from '../graph';
import { WorkflowType, categoryOf } from '../../types';
import {
  BPMNDI_NS,
  BPMN_NS,
  DC_NS,
  DI_NS,
  EVENT_DEFINITION_FOR_TYPE,
  EXPORTER_NAME,
  EXPORTER_VERSION,
  LEGACY_NS,
  PALMYRA_NS,
  TAG_FOR_TYPE,
} from './constants';
import { configOf, eventDefinitionXml, extensionXml } from './extensions';
import { attributes, escapeXml } from './xmlText';

const MAX_NESTING = 50;

const isPool = (n?: GraphNode) => n?.type === 'workflow:pool';
const isLane = (n?: GraphNode) => n?.type === 'workflow:lane';
const isSubProcess = (n?: GraphNode) =>
  n?.type === 'workflow:subProcess' ||
  n?.type === 'workflow:adHocSubProcess' ||
  n?.type === 'workflow:transaction';
const isCollapsed = (n?: GraphNode) => isSubProcess(n) && n?.properties?.isExpanded === false;

const bounds = (box: { x: number; y: number; width: number; height: number }) =>
  `<dc:Bounds ${attributes({ x: box.x, y: box.y, width: box.width, height: box.height })} />`;

const labelXml = (label: GraphNode['label']) =>
  label ? `\n        <bpmndi:BPMNLabel>\n          ${bounds(label)}\n        </bpmndi:BPMNLabel>` : '';

function createHierarchy(graph: WorkflowGraph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const parentOf = (n: GraphNode) => (n.parent ? byId.get(n.parent) : undefined);

  const ancestors = (n: GraphNode) => {
    const result: GraphNode[] = [];
    for (let p = parentOf(n); p && result.length < MAX_NESTING; p = parentOf(p)) result.push(p);
    return result;
  };

  return {
    byId,
    parentOf,
    depth: (n: GraphNode) => ancestors(n).length,
    containerIdOf: (n: GraphNode) => ancestors(n).find((p) => isPool(p) || isSubProcess(p))?.id ?? '',
    laneOf: (n: GraphNode) => {
      for (const p of ancestors(n)) {
        if (isLane(p)) return p;
        if (isPool(p) || isSubProcess(p)) return undefined;
      }
      return undefined;
    },
    planeIdOf: (n: GraphNode) => ancestors(n).find(isCollapsed)?.id ?? '',
  };
}

type Hierarchy = ReturnType<typeof createHierarchy>;

function indexSequenceFlows(edges: GraphEdge[]) {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  const add = (map: Map<string, string[]>, key: string, id: string) =>
    map.set(key, [...(map.get(key) || []), id]);

  for (const edge of edges) {
    if (edge.type !== 'workflow:sequenceFlow') continue;
    if (edge.source) add(outgoing, edge.source, edge.id);
    if (edge.target) add(incoming, edge.target, edge.id);
  }
  return { incoming, outgoing };
}

function nodeXml(
  node: GraphNode,
  flows: ReturnType<typeof indexSequenceFlows>,
  nestedContent: string,
): string {
  if (node.type === 'workflow:textAnnotation') {
    return `    <bpmn:textAnnotation ${attributes({ id: node.id })}>\n      <bpmn:text>${escapeXml(node.name || '')}</bpmn:text>\n    </bpmn:textAnnotation>`;
  }
  if (node.type === 'workflow:group') {
    const categoryValueRef = node.name ? `CategoryValue_${node.id}` : undefined;
    return `    <bpmn:group ${attributes({ id: node.id, categoryValueRef })} />`;
  }

  const tag = TAG_FOR_TYPE[node.type] || 'task';
  const attrs: Record<string, unknown> = { id: node.id, name: node.name };
  if (node.type === 'workflow:boundaryEvent' && node.parent) attrs.attachedToRef = node.parent;

  const flowRefs = [
    ...(flows.incoming.get(node.id) || []).map(
      (id) => `\n        <bpmn:incoming>${escapeXml(id)}</bpmn:incoming>`,
    ),
    ...(flows.outgoing.get(node.id) || []).map(
      (id) => `\n        <bpmn:outgoing>${escapeXml(id)}</bpmn:outgoing>`,
    ),
  ];
  const documentation = node.properties?.documentation;

  const children = [
    documentation ? `\n        <bpmn:documentation>${escapeXml(documentation)}</bpmn:documentation>` : '',
    eventDefinitionXml(node, EVENT_DEFINITION_FOR_TYPE[node.type]),
    flowRefs.join(''),
    extensionXml(node),
    nestedContent ? '\n' + nestedContent : '',
  ].join('');

  return children
    ? `    <bpmn:${tag} ${attributes(attrs)}>${children}\n    </bpmn:${tag}>`
    : `    <bpmn:${tag} ${attributes(attrs)} />`;
}

function flowXml(edge: GraphEdge): string {
  let tag = 'sequenceFlow';
  if (edge.type === 'workflow:messageFlow') tag = 'messageFlow';
  if (edge.type === 'workflow:association' || edge.type === 'workflow:dataAssociation') tag = 'association';

  const condition =
    edge.type === 'workflow:sequenceFlow' && edge.properties?.conditionExpression
      ? `\n      <bpmn:conditionExpression>${escapeXml(edge.properties.conditionExpression)}</bpmn:conditionExpression>`
      : '';
  const attrs = attributes({ id: edge.id, name: edge.name, sourceRef: edge.source, targetRef: edge.target });
  return `    <bpmn:${tag} ${attrs}>${condition}\n    </bpmn:${tag}>`;
}

function shapeDi(node: GraphNode): string {
  const horizontal = isPool(node) || isLane(node) ? ' isHorizontal="true"' : '';
  const expanded = isSubProcess(node) ? ` isExpanded="${isCollapsed(node) ? 'false' : 'true'}"` : '';
  const id = escapeXml(node.id);
  return (
    `      <bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}"${horizontal}${expanded}>\n` +
    `        ${bounds(node)}${labelXml(node.label)}\n` +
    `      </bpmndi:BPMNShape>`
  );
}

function edgeDi(edge: GraphEdge): string {
  const id = escapeXml(edge.id);
  const waypoints = (edge.waypoints || []).map((p) => `        <di:waypoint ${attributes(p)} />`).join('\n');
  return (
    `      <bpmndi:BPMNEdge id="${id}_di" bpmnElement="${id}">\n` +
    `${waypoints}${labelXml(edge.label)}\n` +
    `      </bpmndi:BPMNEdge>`
  );
}

function processBody(graph: WorkflowGraph, tree: Hierarchy, flows: ReturnType<typeof indexSequenceFlows>) {
  const body = graph.nodes.filter((n) => !isPool(n) && !isLane(n));
  const flowsInProcess = graph.edges.filter((e) => e.type !== 'workflow:messageFlow');

  const emitContainer = (containerId: string): string => {
    const items = body
      .filter((n) => tree.containerIdOf(n) === containerId)
      .map((n) => nodeXml(n, flows, isSubProcess(n) ? emitContainer(n.id) : ''));
    const edges = flowsInProcess
      .filter((e) => {
        const source = tree.byId.get(e.source);
        return source && tree.containerIdOf(source) === containerId;
      })
      .map(flowXml);
    return [...items, ...edges].join('\n');
  };

  const laneSetXml = (pool: GraphNode) => {
    const lanes = graph.nodes.filter((l) => isLane(l) && l.parent === pool.id).sort((a, b) => a.y - b.y);
    if (!lanes.length) return '';

    const flowNodeRefs = (lane: GraphNode) =>
      body
        .filter(
          (n) =>
            tree.laneOf(n) === lane &&
            ['event', 'task', 'gateway'].includes(categoryOf(n.type as WorkflowType)),
        )
        .map((n) => `\n        <bpmn:flowNodeRef>${escapeXml(n.id)}</bpmn:flowNodeRef>`)
        .join('');
    const laneXml = (lane: GraphNode) =>
      `      <bpmn:lane ${attributes({ id: lane.id, name: lane.name })}>${flowNodeRefs(lane)}\n      </bpmn:lane>`;

    return `\n    <bpmn:laneSet id="LaneSet_${escapeXml(pool.id)}">\n${lanes.map(laneXml).join('\n')}\n    </bpmn:laneSet>`;
  };

  return { emitContainer, laneSetXml };
}

const processIdOf = (pool: GraphNode) => String(pool.properties?.processRef || `Process_${pool.id}`);
const isExecutable = (pool: GraphNode) =>
  pool.properties?.isExecutable === true || pool.properties?.isExecutable === 'true' ? 'true' : 'false';

function collaborationXml(pools: GraphNode[], messageFlows: string) {
  if (!pools.length) return '';
  const participants = pools.map((pool) => {
    const documentation = pool.properties?.documentation;
    const attrs = attributes({ id: pool.id, name: pool.name, processRef: processIdOf(pool) });
    if (!documentation) return `    <bpmn:participant ${attrs} />`;
    return `    <bpmn:participant ${attrs}>\n      <bpmn:documentation>${escapeXml(documentation)}</bpmn:documentation>\n    </bpmn:participant>`;
  });
  const flows = messageFlows ? '\n' + messageFlows : '';
  return `\n  <bpmn:collaboration id="Collaboration_1">\n${participants.join('\n')}${flows}\n  </bpmn:collaboration>`;
}

function rootDefinitionsXml(nodes: GraphNode[]) {
  const withConfig = nodes.map((node) => ({ node, config: configOf(node) }));
  const messages = withConfig.filter(({ config }) => config.message?.name);
  const signals = withConfig.filter(({ config }) => config.signal?.name);
  const errors = withConfig.filter(({ config }) => config.error?.code);
  const groups = nodes.filter((n) => n.type === 'workflow:group' && n.name);

  return [
    ...messages.map(
      ({ node, config }) =>
        `  <bpmn:message id="Message_${escapeXml(node.id)}" name="${escapeXml(config.message.name)}" />`,
    ),
    ...signals.map(
      ({ node, config }) =>
        `  <bpmn:signal id="Signal_${escapeXml(node.id)}" name="${escapeXml(config.signal.name)}" />`,
    ),
    ...errors.map(
      ({ node, config }) =>
        `  <bpmn:error id="Error_${escapeXml(node.id)}" errorCode="${escapeXml(config.error.code)}" />`,
    ),
    ...groups.map(
      (n) =>
        `  <bpmn:category id="Category_${escapeXml(n.id)}">\n    <bpmn:categoryValue id="CategoryValue_${escapeXml(n.id)}" value="${escapeXml(n.name)}" />\n  </bpmn:category>`,
    ),
  ].join('\n');
}

function diagramsXml(graph: WorkflowGraph, tree: Hierarchy, rootElement: string) {
  const nodesByDepth = graph.nodes
    .map((node, index) => ({ node, index }))
    .sort((a, b) => tree.depth(a.node) - tree.depth(b.node) || a.index - b.index)
    .map(({ node }) => node);

  const planeOfEdge = (edge: GraphEdge) => {
    const source = tree.byId.get(edge.source);
    return source ? tree.planeIdOf(source) : '';
  };

  const planeXml = (diagramId: string, planeId: string, bpmnElement: string, owner: string) => {
    const shapes = nodesByDepth.filter((n) => tree.planeIdOf(n) === owner).map(shapeDi);
    const edges = graph.edges.filter((e) => planeOfEdge(e) === owner).map(edgeDi);
    return (
      `  <bpmndi:BPMNDiagram id="${diagramId}">\n` +
      `    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${escapeXml(bpmnElement)}">\n` +
      `${[...shapes, ...edges].join('\n')}\n` +
      `    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>`
    );
  };

  const collapsedWithContent = graph.nodes
    .filter(isCollapsed)
    .filter((n) => graph.nodes.some((child) => child.parent === n.id));
  const extraPlanes = collapsedWithContent.map((n, i) =>
    planeXml(`BPMNDiagram_${i + 2}`, `${n.id}_plane`, n.id, n.id),
  );

  return [planeXml('BPMNDiagram_1', 'BPMNPlane_1', rootElement, ''), ...extraPlanes].join('\n');
}

export function serializeToXml(graph: WorkflowGraph): string {
  const tree = createHierarchy(graph);
  const flows = indexSequenceFlows(graph.edges);
  const pools = graph.nodes.filter(isPool);
  const { emitContainer, laneSetXml } = processBody(graph, tree, flows);

  const processes = pools.map(
    (pool) =>
      `  <bpmn:process id="${escapeXml(processIdOf(pool))}" isExecutable="${isExecutable(pool)}">${laneSetXml(pool)}\n${emitContainer(pool.id)}\n  </bpmn:process>`,
  );
  const topLevel = emitContainer('');
  if (!pools.length || topLevel) {
    processes.unshift(`  <bpmn:process id="Process_1" isExecutable="false">\n${topLevel}\n  </bpmn:process>`);
  }

  const messageFlows = graph.edges
    .filter((e) => e.type === 'workflow:messageFlow')
    .map(flowXml)
    .join('\n');
  const definitions = rootDefinitionsXml(graph.nodes);
  const rootElement = pools.length ? 'Collaboration_1' : 'Process_1';

  const namespaces = [
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    `xmlns:bpmn="${BPMN_NS}"`,
    `xmlns:bpmndi="${BPMNDI_NS}"`,
    `xmlns:dc="${DC_NS}"`,
    `xmlns:di="${DI_NS}"`,
    `xmlns:palmyra="${PALMYRA_NS}"`,
    `xmlns:workflow="${LEGACY_NS}"`,
  ].join(' ');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<bpmn:definitions ${namespaces} id="Definitions_1" targetNamespace="${PALMYRA_NS}" ` +
    `exporter="${EXPORTER_NAME}" exporterVersion="${EXPORTER_VERSION}">` +
    `${definitions ? '\n' + definitions : ''}${collaborationXml(pools, messageFlows)}\n` +
    `${processes.join('\n')}\n${diagramsXml(graph, tree, rootElement)}\n</bpmn:definitions>`
  );
}
