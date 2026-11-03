import type { GraphNode, WorkflowGraph } from '../../workflow/io/graph';

export const isSubType = (t: string) => /(subprocess|transaction)$/i.test(t);
export const isEvent = (t: string) => /event/i.test(t);
export const isGateway = (t: string) => /gateway/i.test(t);
export const isOutlineType = (t: string) => /(pool|lane|group)$/i.test(t);
export const typeName = (t: string) =>
  t
    .replace(/^workflow:/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

export interface Model {
  byId: Map<string, GraphNode>;

  ancestors: Map<string, string[]>;
  collapsed: Set<string>;

  size: Map<string, number>;
}

export function buildModel(graph: WorkflowGraph): Model {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const containerOf = (n: GraphNode): string | undefined => {
    const p = n.parent ? byId.get(n.parent) : undefined;
    return n.type === 'workflow:boundaryEvent' && p ? p.parent : n.parent;
  };
  const ancestors = new Map<string, string[]>();
  for (const n of graph.nodes) {
    const chain: string[] = [];
    for (let id = containerOf(n), guard = 0; id && guard < 50; guard++) {
      chain.push(id);
      const p = byId.get(id);
      id = p ? containerOf(p) : undefined;
    }
    ancestors.set(n.id, chain);
  }
  const collapsed = new Set(
    graph.nodes.filter((n) => isSubType(n.type) && n.properties?.isExpanded === false).map((n) => n.id),
  );
  const size = new Map<string, number>();
  for (const n of graph.nodes)
    for (const a of ancestors.get(n.id) ?? []) if (collapsed.has(a)) size.set(a, (size.get(a) ?? 0) + 1);
  return { byId, ancestors, collapsed, size };
}

export function levelOf(graph: WorkflowGraph, model: Model, drilledId: string | null) {
  const nodes = graph.nodes.filter((n) => {
    if (n.id === drilledId) return false;
    const chain = model.ancestors.get(n.id) ?? [];
    if (drilledId) {
      const at = chain.indexOf(drilledId);
      return at >= 0 && !chain.slice(0, at).some((id) => model.collapsed.has(id));
    }
    return !chain.some((id) => model.collapsed.has(id));
  });

  const ordered = nodes
    .map((n, i) => ({ n, i, d: model.ancestors.get(n.id)?.length ?? 0 }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.n);
  const visible = new Set(ordered.map((n) => n.id));
  const edges = graph.edges.filter((e) => visible.has(e.source) && visible.has(e.target));
  return { nodes: ordered, edges };
}

export function wrap(text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= max) cur = next;
    else {
      if (cur) out.push(cur);
      cur = word;
    }
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = `${out[lines - 1].slice(0, Math.max(1, max - 1))}…`;
  }
  return out.map((l) => (l.length > max + 2 ? `${l.slice(0, max)}…` : l));
}

export interface ViewBox {
  minX: number;
  minY: number;
  w: number;
  h: number;
}

const LABEL_SPACE_BELOW = 34;
const PADDING = 40;
const MIN_WIDTH = 360;
const MIN_HEIGHT = 220;

export function computeViewBox(nodes: GraphNode[], edges: WorkflowGraph['edges']): ViewBox | null {
  if (!nodes.length) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  for (const node of nodes) {
    const hasLabelBelow = isEvent(node.type) || isGateway(node.type) || /data/i.test(node.type);
    xs.push(node.x, node.x + node.width);
    ys.push(node.y, node.y + node.height + (hasLabelBelow ? LABEL_SPACE_BELOW : 0));
    if (node.label) {
      xs.push(node.label.x, node.label.x + node.label.width);
      ys.push(node.label.y, node.label.y + node.label.height);
    }
  }
  for (const edge of edges) {
    for (const point of edge.waypoints ?? []) {
      xs.push(point.x);
      ys.push(point.y);
    }
  }

  const minX = Math.min(...xs) - PADDING;
  const minY = Math.min(...ys) - PADDING;
  const w = Math.max(Math.max(...xs) + PADDING - minX, MIN_WIDTH);
  const h = Math.max(Math.max(...ys) + PADDING - minY, MIN_HEIGHT);
  return { minX, minY, w, h };
}
