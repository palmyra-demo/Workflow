import { WorkflowGraph, GraphEdge, GraphNode } from './io/graph';
import { categoryOf, isEndEventType, isStartEventType } from './types';
import { validateProperties } from './palmyraExtensions';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
  elementId?: string;
  field?: string;
}

const GEOMETRY_TOLERANCE = 1;

const SUB_PROCESS_TYPES = ['workflow:subProcess', 'workflow:adHocSubProcess', 'workflow:transaction'];
const CONTAINER_TYPES = new Set(['workflow:pool', 'workflow:lane', ...SUB_PROCESS_TYPES]);

const labelOf = (item: { name?: string; id: string }) => item.name || item.id;
const shortType = (type: string) => type.replace('workflow:', '');

interface Context {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeById: Map<string, GraphNode>;
  issues: ValidationIssue[];
}

const error = (ctx: Context, message: string, elementId?: string) =>
  ctx.issues.push({ level: 'error', message, elementId });

const warning = (ctx: Context, message: string, elementId?: string) =>
  ctx.issues.push({ level: 'warning', message, elementId });

function countSequenceFlows(edges: GraphEdge[]) {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const edge of edges) {
    if (edge.type !== 'workflow:sequenceFlow') continue;
    outgoing.set(edge.source, (outgoing.get(edge.source) || 0) + 1);
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
  }
  return { incoming, outgoing };
}

const MAX_NESTING = 50;

function findPool(node: GraphNode | undefined, nodeById: Map<string, GraphNode>) {
  let current = node;
  for (let depth = 0; current && depth <= MAX_NESTING; depth++) {
    if (current.type === 'workflow:pool') return current;
    current = current.parent ? nodeById.get(current.parent) : undefined;
  }
  return undefined;
}

function checkStartAndEndEvents(ctx: Context) {
  if (!ctx.nodes.some((n) => isStartEventType(n.type))) error(ctx, 'Workflow has no start event.');
  if (!ctx.nodes.some((n) => isEndEventType(n.type))) error(ctx, 'Workflow has no end event.');
}

function checkNodes(ctx: Context) {
  const { incoming, outgoing } = countSequenceFlows(ctx.edges);
  const seenIds = new Set<string>();

  for (const node of ctx.nodes) {
    const id = node.id;
    const name = labelOf(node);
    if (seenIds.has(id)) error(ctx, `Duplicate element id "${id}".`, id);
    seenIds.add(id);

    const inCount = incoming.get(id) || 0;
    const outCount = outgoing.get(id) || 0;

    if (isStartEventType(node.type)) {
      if (inCount > 0) error(ctx, `Start event "${name}" must not have incoming sequence flows.`, id);
      if (outCount === 0) warning(ctx, `Start event "${name}" has no outgoing flow.`, id);
    }
    if (isEndEventType(node.type)) {
      if (outCount > 0) error(ctx, `End event "${name}" must not have outgoing sequence flows.`, id);
      if (inCount === 0) warning(ctx, `End event "${name}" has no incoming flow.`, id);
    }

    const category = categoryOf(node.type);
    if ((category === 'task' || category === 'gateway') && inCount === 0 && outCount === 0) {
      warning(ctx, `"${name}" is not connected to anything.`, id);
    }
    if (category === 'gateway' && inCount + outCount < 2) {
      warning(ctx, `Gateway "${name}" should split or merge flows.`, id);
    }

    for (const issue of validateProperties(node.type, node.properties || {})) {
      ctx.issues.push({ ...issue, elementId: id });
    }
  }
}

function checkContainers(ctx: Context) {
  const hasContainers = ctx.nodes.some((n) => n.type === 'workflow:pool' || n.type === 'workflow:lane');
  if (!hasContainers) return;

  for (const node of ctx.nodes) {
    const name = labelOf(node);

    if (node.type === 'workflow:pool') {
      if (node.parent) error(ctx, `Pool "${name}" cannot be inside another element.`, node.id);
      continue;
    }
    if (node.type === 'workflow:lane') {
      const parent = node.parent ? ctx.nodeById.get(node.parent) : undefined;
      if (!parent || parent.type !== 'workflow:pool')
        error(ctx, `Lane "${name}" must be inside a Pool.`, node.id);
      continue;
    }

    const category = categoryOf(node.type);
    const isFlowNode = category === 'event' || category === 'task' || category === 'gateway';
    if (!isFlowNode) continue;

    if (!findPool(node, ctx.nodeById)) {
      error(
        ctx,
        `Element "${name}" must be inside a Pool/Lane when the workflow uses Pool/Lane containers.`,
        node.id,
      );
    }
    if (node.parent && node.type !== 'workflow:boundaryEvent') {
      const parent = ctx.nodeById.get(node.parent);
      if (parent && !CONTAINER_TYPES.has(parent.type)) {
        error(ctx, `Element "${name}" has invalid parent "${labelOf(parent)}".`, node.id);
      }
    }
  }
}

function checkGeometry(ctx: Context) {
  const tol = GEOMETRY_TOLERANCE;
  for (const node of ctx.nodes) {
    const parent = node.parent ? ctx.nodeById.get(node.parent) : undefined;
    if (!parent || !CONTAINER_TYPES.has(parent.type) || node.type === 'workflow:boundaryEvent') continue;

    const parentIsCollapsed =
      SUB_PROCESS_TYPES.includes(parent.type) && parent.properties?.isExpanded === false;
    if (parentIsCollapsed) continue;

    const inside =
      node.x >= parent.x - tol &&
      node.y >= parent.y - tol &&
      node.x + node.width <= parent.x + parent.width + tol &&
      node.y + node.height <= parent.y + parent.height + tol;
    if (!inside) {
      error(
        ctx,
        `"${labelOf(node)}" lies outside its ${shortType(parent.type)} "${labelOf(parent)}".`,
        node.id,
      );
    }
  }

  const lanes = ctx.nodes.filter((n) => n.type === 'workflow:lane');
  for (const pool of ctx.nodes.filter((n) => n.type === 'workflow:pool')) {
    const own = lanes.filter((l) => l.parent === pool.id).sort((a, b) => a.y - b.y);
    for (let i = 1; i < own.length; i++) {
      const previous = own[i - 1];
      if (own[i].y < previous.y + previous.height - tol) {
        error(ctx, `Lanes "${labelOf(previous)}" and "${labelOf(own[i])}" overlap.`, own[i].id);
      }
    }
  }
}

function checkPoolCrossing(ctx: Context) {
  for (const edge of ctx.edges) {
    const source = ctx.nodeById.get(edge.source);
    const target = ctx.nodeById.get(edge.target);
    if (!source || !target) continue;

    const sourcePool = findPool(source, ctx.nodeById)?.id;
    const targetPool = findPool(target, ctx.nodeById)?.id;

    if (edge.type === 'workflow:sequenceFlow' && sourcePool !== targetPool) {
      error(
        ctx,
        `Sequence flow "${edge.id}" cannot cross Pool boundaries. Use Message Flow between different Pools.`,
        edge.id,
      );
    }
    if (edge.type === 'workflow:messageFlow' && sourcePool && targetPool && sourcePool === targetPool) {
      error(ctx, `Message flow "${edge.id}" must connect elements in different Pools.`, edge.id);
    }
  }
}

function checkEdges(ctx: Context) {
  for (const edge of ctx.edges) {
    if (!ctx.nodeById.has(edge.source)) {
      error(ctx, `Flow "${edge.id}" references missing source "${edge.source}".`, edge.id);
    }
    if (!ctx.nodeById.has(edge.target)) {
      error(ctx, `Flow "${edge.id}" references missing target "${edge.target}".`, edge.id);
    }
    if (edge.type === 'workflow:sequenceFlow' && edge.source === edge.target) {
      error(ctx, `Sequence flow "${edge.id}" cannot connect an element to itself.`, edge.id);
    }
    if (!edge.waypoints?.length) warning(ctx, `Flow "${edge.id}" has no DI waypoints.`, edge.id);
  }
}

export function validate(graph: WorkflowGraph): ValidationIssue[] {
  const ctx: Context = {
    nodes: graph.nodes,
    edges: graph.edges,
    nodeById: new Map(graph.nodes.map((n) => [n.id, n])),
    issues: [],
  };

  checkStartAndEndEvents(ctx);
  checkNodes(ctx);
  checkContainers(ctx);
  checkGeometry(ctx);
  checkPoolCrossing(ctx);
  checkEdges(ctx);

  return ctx.issues;
}
