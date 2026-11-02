import { WorkflowType, isConnectionType } from '../types';
import { getObstacles } from '../routing/obstacles';
import { pathCollides } from '../routing/obstacleRouter';

// saved waypoints are only reused if they still dock on source/target and avoid other shapes
function isRouteValid(waypoints: Array<{ x: number; y: number }>, source: any, target: any, registry: any): boolean {
  if (!waypoints || waypoints.length < 2) return false;
  const near = (p: { x: number; y: number }, s: any) =>
    p.x >= s.x - 3 && p.x <= s.x + s.width + 3 && p.y >= s.y - 3 && p.y <= s.y + s.height + 3;
  if (!near(waypoints[0], source) || !near(waypoints[waypoints.length - 1], target)) return false;
  return !pathCollides(waypoints, getObstacles(registry, source, target));
}

export interface GraphNode {
  id: string;
  type: WorkflowType;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parent?: string;
  /** bounds of the external label (events, gateways, data) – absent while the element has no name */
  label?: { x: number; y: number; width: number; height: number };
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  type: WorkflowType;
  name?: string;
  source: string;
  target: string;
  parent?: string;
  waypoints: Array<{ x: number; y: number }>;
  /** bounds of the connection label (absent while the connection has no name) */
  label?: { x: number; y: number; width: number; height: number };
  properties: Record<string, any>;
}

export interface WorkflowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const BO_FIELDS = [
  'documentation',
  'taskType',
  'assignee',
  'eventType',
  'eventDefinition',
  'gatewayType',
  'conditionExpression',
  'messageName',
  'associationDirection',
  'defaultFlow',
  'bpmnType',
  'processRef',
  'isExecutable',
  'isExpanded',
  'expandedBounds',
];

function collectProperties(bo: any): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const f of BO_FIELDS) {
    if (bo[f] !== undefined && bo[f] !== null && bo[f] !== '') {
      props[f] = bo[f];
    }
  }
  if (bo.palmyra && typeof bo.palmyra === 'object' && Object.keys(bo.palmyra).length) props.palmyra = JSON.parse(JSON.stringify(bo.palmyra));
  if (bo.customProperties && typeof bo.customProperties === 'object' && Object.keys(bo.customProperties).length) {
    props.customProperties = { ...bo.customProperties };
  }
  return props;
}

export function exportGraph(elementRegistry: any): WorkflowGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  elementRegistry.getAll().forEach((element: any) => {
    const type = element.type as WorkflowType;
    if (!type || !type.startsWith('workflow:')) return; // skip root, labels

    const bo = element.businessObject || {};
    const parent =
      element.parent && element.parent.type && element.parent.type.startsWith('workflow:')
        ? element.parent.id
        : undefined;

    if (isConnectionType(type) || element.waypoints) {
      edges.push({
        id: element.id,
        type,
        name: bo.name,
        source: element.source?.id,
        target: element.target?.id,
        parent,
        waypoints: (element.waypoints || []).map((p: any) => ({ x: p.x, y: p.y })),
        ...((element.labels || [])[0] ? { label: { x: element.labels[0].x, y: element.labels[0].y, width: element.labels[0].width, height: element.labels[0].height } } : {}),
        properties: collectProperties(bo),
      });
    } else {
      nodes.push({
        id: element.id,
        type,
        name: bo.name,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        parent,
        ...((element.labels || [])[0] ? { label: { x: element.labels[0].x, y: element.labels[0].y, width: element.labels[0].width, height: element.labels[0].height } } : {}),
        properties: collectProperties(bo),
      });
    } 
  });

  return { nodes, edges };
}

export function importGraph(modeler: any, graph: WorkflowGraph): void {
  const elementFactory = modeler.get('elementFactory');
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');

  const existing = elementRegistry
    .getAll()
    .filter((e: any) => e.type && e.type.startsWith('workflow:'));
  if (existing.length) {
    modeling.removeElements(existing.slice());
  }

  const root = canvas.getRootElement();
  const created = new Map<string, any>();

  // parents (pools, lanes, sub-processes, host tasks) must exist before their children
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const depth = (n: GraphNode): number => {
    let d = 0;
    for (let p = n.parent ? byId.get(n.parent) : undefined; p && d < 50; p = p.parent ? byId.get(p.parent) : undefined) d++;
    return d;
  };
  const ordered = graph.nodes.map((n, i) => ({ n, i, d: depth(n) })).sort((a, b) => a.d - b.d || a.i - b.i).map((x) => x.n);

  for (const node of ordered) {
    const { documentation, taskType, assignee, eventType, eventDefinition, gatewayType, conditionExpression, messageName, associationDirection, defaultFlow, bpmnType, processRef, isExecutable, isExpanded, expandedBounds, palmyra, customProperties, ...rest } =
      node.properties || {};

    const shape = elementFactory.createWorkflowShape(node.type, {
      id: node.id,
      width: node.width,
      height: node.height,
      businessObject: {
        id: node.id,
        type: node.type,
        name: node.name,
        documentation,
        taskType,
        assignee,
        eventType,
        eventDefinition,
        gatewayType,
        conditionExpression,
        messageName,
        associationDirection,
        defaultFlow,
        bpmnType,
        processRef,
        isExecutable,
        isExpanded,
        expandedBounds,
        palmyra: palmyra || {},
        customProperties: { ...(customProperties as any || {}), ...rest },
      },
    });

    const parent = node.parent && created.get(node.parent) ? created.get(node.parent) : root;
    const position = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    const createdShape = modeling.createShape(shape, position, parent, { importing: true, autoResize: false });
    created.set(node.id, createdShape);

    // restore the (possibly moved) label position
    const label = (createdShape.labels || [])[0];
    const lb = node.label;
    if (label && lb && (label.x !== lb.x || label.y !== lb.y || label.width !== lb.width || label.height !== lb.height)) {
      modeling.resizeShape(label, { x: lb.x, y: lb.y, width: lb.width, height: lb.height }, null, { autoResize: false });
    }
  }

  for (const edge of graph.edges) {
    const source = created.get(edge.source);
    const target = created.get(edge.target);
    if (!source || !target) continue;

    const connection = modeling.connect(source, target, {
      id: edge.id,
      type: edge.type,
      businessObject: {
        id: edge.id,
        type: edge.type,
        name: edge.name,
        ...edge.properties,
        palmyra: (edge.properties as any)?.palmyra || {},
        customProperties: (edge.properties as any)?.customProperties || {},
      },
      ...(isRouteValid(edge.waypoints, source, target, elementRegistry) ? { waypoints: edge.waypoints } : {}),
    });

    const label = (connection?.labels || [])[0];
    const lb = edge.label;
    if (label && lb && (label.x !== lb.x || label.y !== lb.y || label.width !== lb.width || label.height !== lb.height)) {
      modeling.resizeShape(label, { x: lb.x, y: lb.y, width: lb.width, height: lb.height }, null, { autoResize: false });
    }
  }
}
