import type { WorkflowGraph, GraphNode, GraphEdge } from '../io/graph';
import type { WorkflowType } from '../types';

export const HISTORY_FORMAT = 'workflow-versions';
export const HISTORY_SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'workflow-editor:version-history:v1';

export interface WorkflowVersion {
  id: string;

  version: number;
  versionTag?: string;
  comment: string;
  createdAt: string;

  checksum: string;
  stats: { nodes: number; edges: number };
  graph: WorkflowGraph;
}

export interface WorkflowDraft {
  basedOn: number | null;
  updatedAt: string;

  checksum: string;

  baseChecksum: string;
  graph: WorkflowGraph;
}

export interface VersionHistory {
  format: typeof HISTORY_FORMAT;
  schemaVersion: number;
  workflowId: string;
  name: string;
  nextVersion: number;

  versions: WorkflowVersion[];

  draft: WorkflowDraft | null;
}

export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const round = (n: unknown) => (typeof n === 'number' ? Math.round(n * 10) / 10 : n);
type Bounds = { x: number; y: number; width: number; height: number };
const roundBounds = (b?: Bounds) =>
  b ? { x: round(b.x), y: round(b.y), width: round(b.width), height: round(b.height) } : null;

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = sortKeys(v);
    }
    return out;
  }
  return value;
}
export const stableStringify = (v: unknown): string => JSON.stringify(sortKeys(v));

function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const canonNode = (n: GraphNode) => ({
  id: n.id,
  type: n.type,
  name: n.name ?? '',
  parent: n.parent ?? null,
  x: round(n.x),
  y: round(n.y),
  width: round(n.width),
  height: round(n.height),
  label: roundBounds(n.label),
  properties: n.properties ?? {},
});
const canonEdge = (e: GraphEdge) => ({
  id: e.id,
  type: e.type,
  name: e.name ?? '',
  parent: e.parent ?? null,
  source: e.source,
  target: e.target,
  waypoints: (e.waypoints ?? []).map((p) => ({ x: round(p.x), y: round(p.y) })),
  label: roundBounds(e.label),
  properties: e.properties ?? {},
});

export function graphChecksum(graph: WorkflowGraph): string {
  return hash(
    stableStringify({
      nodes: [...graph.nodes].sort(byId).map(canonNode),
      edges: [...graph.edges].sort(byId).map(canonEdge),
    }),
  );
}

export function createEmptyHistory(): VersionHistory {
  return {
    format: HISTORY_FORMAT,
    schemaVersion: HISTORY_SCHEMA_VERSION,
    workflowId: uid('wf'),
    name: 'Workflow',
    nextVersion: 1,
    versions: [],
    draft: null,
  };
}

export function addVersion(
  history: VersionHistory,
  graph: WorkflowGraph,
  opts: { comment?: string; versionTag?: string },
): { history: VersionHistory; version: WorkflowVersion } {
  const snapshot = clone(graph);
  const version: WorkflowVersion = {
    id: uid('ver'),
    version: history.nextVersion,
    versionTag: opts.versionTag?.trim() || undefined,
    comment: opts.comment?.trim() ?? '',
    createdAt: new Date().toISOString(),
    checksum: graphChecksum(snapshot),
    stats: { nodes: snapshot.nodes.length, edges: snapshot.edges.length },
    graph: snapshot,
  };
  return {
    version,
    history: { ...history, nextVersion: history.nextVersion + 1, versions: [...history.versions, version] },
  };
}

export function makeDraft(
  graph: WorkflowGraph,
  basedOn: number | null,
  baseChecksum?: string,
): WorkflowDraft {
  const snapshot = clone(graph);
  const checksum = graphChecksum(snapshot);
  return {
    basedOn,
    updatedAt: new Date().toISOString(),
    checksum,
    baseChecksum: baseChecksum ?? checksum,
    graph: snapshot,
  };
}

export const draftIsEdited = (draft: WorkflowDraft): boolean => draft.checksum !== draft.baseChecksum;

export function removeVersion(history: VersionHistory, id: string): VersionHistory {
  return { ...history, versions: history.versions.filter((v) => v.id !== id) };
}

export function serializeHistory(history: VersionHistory, pretty = true): string {
  return JSON.stringify(history, null, pretty ? 2 : undefined);
}

export function parseHistory(text: string): VersionHistory {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (!data || typeof data !== 'object' || data.format !== HISTORY_FORMAT) {
    throw new Error('Not a workflow version-history file (missing format "workflow-versions").');
  }
  if (typeof data.schemaVersion === 'number' && data.schemaVersion > HISTORY_SCHEMA_VERSION) {
    throw new Error(
      `History schema v${data.schemaVersion} is newer than this editor supports (v${HISTORY_SCHEMA_VERSION}).`,
    );
  }
  if (!Array.isArray(data.versions)) throw new Error('History has no "versions" array.');

  const ids = new Set<string>();
  const numbers = new Set<number>();
  const versions: WorkflowVersion[] = [];
  for (const raw of data.versions) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      !raw.graph ||
      !Array.isArray(raw.graph.nodes) ||
      !Array.isArray(raw.graph.edges)
    ) {
      throw new Error('A version entry is missing its graph (nodes / edges).');
    }
    const num = Number(raw.version);
    if (!Number.isInteger(num) || num < 1) throw new Error('A version entry has an invalid version number.');
    if (numbers.has(num)) throw new Error(`Version number v${num} appears more than once.`);
    numbers.add(num);

    let id = typeof raw.id === 'string' && raw.id ? raw.id : uid('ver');
    if (ids.has(id)) id = uid('ver');
    ids.add(id);

    const graph: WorkflowGraph = clone({ nodes: raw.graph.nodes, edges: raw.graph.edges });
    versions.push({
      id,
      version: num,
      versionTag:
        typeof raw.versionTag === 'string' && raw.versionTag.trim() ? raw.versionTag.trim() : undefined,
      comment: typeof raw.comment === 'string' ? raw.comment : '',
      createdAt:
        typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
          ? raw.createdAt
          : new Date().toISOString(),

      checksum: graphChecksum(graph),
      stats: { nodes: graph.nodes.length, edges: graph.edges.length },
      graph,
    });
  }
  versions.sort((a, b) => a.version - b.version);

  let draft: WorkflowDraft | null = null;
  const rd = data.draft;
  if (rd && typeof rd === 'object') {
    if (!rd.graph || !Array.isArray(rd.graph.nodes) || !Array.isArray(rd.graph.edges))
      throw new Error('The draft is missing its graph (nodes / edges).');
    const graph: WorkflowGraph = clone({ nodes: rd.graph.nodes, edges: rd.graph.edges });
    const checksum = graphChecksum(graph);
    draft = {
      basedOn: Number.isInteger(rd.basedOn) && rd.basedOn >= 1 ? rd.basedOn : null,
      updatedAt:
        typeof rd.updatedAt === 'string' && !Number.isNaN(Date.parse(rd.updatedAt))
          ? rd.updatedAt
          : new Date().toISOString(),
      checksum,
      baseChecksum: typeof rd.baseChecksum === 'string' && rd.baseChecksum ? rd.baseChecksum : checksum,
      graph,
    };
  }
  const maxVersion = versions.length ? versions[versions.length - 1].version : 0;

  return {
    format: HISTORY_FORMAT,
    schemaVersion: HISTORY_SCHEMA_VERSION,
    workflowId: typeof data.workflowId === 'string' && data.workflowId ? data.workflowId : uid('wf'),
    name: typeof data.name === 'string' && data.name ? data.name : 'Workflow',
    nextVersion: Math.max(Number.isInteger(data.nextVersion) ? data.nextVersion : 1, maxVersion + 1),
    versions,
    draft,
  };
}

const getStorage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export function loadHistory(storageKey = STORAGE_KEY): VersionHistory {
  const storage = getStorage();
  let raw: string | null = null;
  try {
    raw = storage?.getItem(storageKey) ?? null;
    if (raw) return parseHistory(raw);
  } catch (e) {
    console.warn('[versions] stored history is unreadable, starting fresh:', e);

    try {
      if (raw) storage?.setItem(`${storageKey}:corrupt`, raw);
    } catch {
      return createEmptyHistory();
    }
  }
  return createEmptyHistory();
}

export function saveHistory(history: VersionHistory, storageKey = STORAGE_KEY): string | null {
  const storage = getStorage();
  if (!storage)
    return 'Browser storage is unavailable – history will be lost on reload. Export it to keep a copy.';
  try {
    storage.setItem(storageKey, serializeHistory(history, false));
    return null;
  } catch {
    return 'Could not write to browser storage (it may be full). Export the history to keep a copy.';
  }
}

export type ChangeKind = 'added' | 'removed' | 'modified';

export interface ElementChange {
  id: string;
  kind: ChangeKind;
  type: WorkflowType;

  label: string;
  typeLabel: string;
  isConnection: boolean;
  details: string[];
}

export interface GraphDiff {
  added: ElementChange[];
  removed: ElementChange[];
  modified: ElementChange[];
  total: number;
}

const humanizeType = (t: string) => {
  const s = t
    .replace(/^workflow:/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const isPlain = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

function diffProps(
  a: Record<string, unknown> = {},
  b: Record<string, unknown> = {},
  prefix = '',
  depth = 0,
): string[] {
  const out: string[] = [];
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const av = a[key];
    const bv = b[key];
    if (stableStringify(av) === stableStringify(bv)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      depth === 0 &&
      (key === 'palmyra' || key === 'customProperties') &&
      isPlain(av ?? {}) &&
      isPlain(bv ?? {})
    ) {
      out.push(
        ...diffProps((av ?? {}) as Record<string, unknown>, (bv ?? {}) as Record<string, unknown>, path, 1),
      );
    } else {
      out.push(path);
    }
  }
  return out;
}

function sameBounds(a?: Bounds, b?: Bounds) {
  return stableStringify(roundBounds(a)) === stableStringify(roundBounds(b));
}

function describe(
  el: GraphNode | GraphEdge,
  kind: ChangeKind,
  isConnection: boolean,
  details: string[] = [],
): ElementChange {
  const typeLabel = humanizeType(el.type);
  return {
    id: el.id,
    kind,
    type: el.type,
    label: el.name?.trim() || typeLabel,
    typeLabel,
    isConnection,
    details,
  };
}

function nodeDetails(a: GraphNode, b: GraphNode): string[] {
  const d: string[] = [];
  if (a.type !== b.type) d.push(`Type changed: ${humanizeType(a.type)} → ${humanizeType(b.type)}`);
  const an = a.name?.trim() ?? '';
  const bn = b.name?.trim() ?? '';
  if (an !== bn) d.push(!an ? `Named “${bn}”` : !bn ? 'Name removed' : `Renamed “${an}” → “${bn}”`);
  if (round(a.x) !== round(b.x) || round(a.y) !== round(b.y)) d.push('Moved');
  if (round(a.width) !== round(b.width) || round(a.height) !== round(b.height)) d.push('Resized');
  if ((a.parent ?? null) !== (b.parent ?? null)) d.push('Moved to another container');
  if (!sameBounds(a.label, b.label)) d.push('Label moved');
  const props = diffProps(a.properties, b.properties);
  if (props.length)
    d.push(
      `Properties: ${props.slice(0, 4).join(', ')}${props.length > 4 ? ` +${props.length - 4} more` : ''}`,
    );
  return d;
}

function edgeDetails(a: GraphEdge, b: GraphEdge): string[] {
  const d: string[] = [];
  if (a.type !== b.type) d.push(`Type changed: ${humanizeType(a.type)} → ${humanizeType(b.type)}`);
  const an = a.name?.trim() ?? '';
  const bn = b.name?.trim() ?? '';
  if (an !== bn) d.push(!an ? `Named “${bn}”` : !bn ? 'Name removed' : `Renamed “${an}” → “${bn}”`);
  if (a.source !== b.source || a.target !== b.target) d.push('Reconnected');
  if ((a.parent ?? null) !== (b.parent ?? null)) d.push('Moved to another container');
  if (!sameBounds(a.label, b.label)) d.push('Label moved');
  const props = diffProps(a.properties, b.properties);
  if (props.length)
    d.push(
      `Properties: ${props.slice(0, 4).join(', ')}${props.length > 4 ? ` +${props.length - 4} more` : ''}`,
    );
  if (stableStringify(canonEdge(a).waypoints) !== stableStringify(canonEdge(b).waypoints)) d.push('Rerouted');
  return d;
}

export function diffGraphs(base: WorkflowGraph, target: WorkflowGraph): GraphDiff {
  type Entry = { el: GraphNode | GraphEdge; isConnection: boolean };
  const index = (g: WorkflowGraph) => {
    const m = new Map<string, Entry>();
    g.nodes.forEach((el) => m.set(el.id, { el, isConnection: false }));
    g.edges.forEach((el) => m.set(el.id, { el, isConnection: true }));
    return m;
  };
  const a = index(base);
  const b = index(target);
  const added: ElementChange[] = [];
  const removed: ElementChange[] = [];
  const modified: ElementChange[] = [];

  for (const [id, after] of b) {
    const before = a.get(id);
    if (!before || before.isConnection !== after.isConnection) {
      added.push(describe(after.el, 'added', after.isConnection));
      continue;
    }
    const details = after.isConnection
      ? edgeDetails(before.el as GraphEdge, after.el as GraphEdge)
      : nodeDetails(before.el as GraphNode, after.el as GraphNode);
    if (details.length) modified.push(describe(after.el, 'modified', after.isConnection, details));
  }
  for (const [id, before] of a) {
    const after = b.get(id);
    if (!after || after.isConnection !== before.isConnection)
      removed.push(describe(before.el, 'removed', before.isConnection));
  }

  const byLabel = (x: ElementChange, y: ElementChange) => x.label.localeCompare(y.label);
  added.sort(byLabel);
  removed.sort(byLabel);
  modified.sort(byLabel);
  return { added, removed, modified, total: added.length + removed.length + modified.length };
}
