import { WorkflowGraph } from './io/graph';
import { categoryOf } from './types';
import { applicableExtensions, validateProperties } from './palmyraExtensions';

export interface ValidationIssue { level: 'error' | 'warning'; message: string; elementId?: string; field?: string; }

export function validate(graph: WorkflowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { nodes, edges } = graph;
  const incoming = new Map<string, number>(), outgoing = new Map<string, number>();
  for (const e of edges) if (e.type === 'workflow:sequenceFlow') { outgoing.set(e.source, (outgoing.get(e.source) || 0) + 1); incoming.set(e.target, (incoming.get(e.target) || 0) + 1); }
  const startEvents = nodes.filter(n => /startevent$/i.test(n.type) || n.type === 'workflow:startEvent');
  const endEvents = nodes.filter(n => /endevent$/i.test(n.type) || n.type === 'workflow:endEvent');
  if (!startEvents.length) issues.push({ level: 'error', message: 'Workflow has no start event.' });
  if (!endEvents.length) issues.push({ level: 'error', message: 'Workflow has no end event.' });

  const ids = new Set<string>();
  for (const n of nodes) {
    if (ids.has(n.id)) issues.push({ level: 'error', message: `Duplicate element id "${n.id}".`, elementId: n.id });
    ids.add(n.id);
    const inc = incoming.get(n.id) || 0, out = outgoing.get(n.id) || 0;
    if ((/startevent$/i.test(n.type) || n.type === 'workflow:startEvent') && inc > 0) issues.push({ level: 'error', message: `Start event "${n.name || n.id}" must not have incoming sequence flows.`, elementId: n.id });
    if ((/startevent$/i.test(n.type) || n.type === 'workflow:startEvent') && out === 0) issues.push({ level: 'warning', message: `Start event "${n.name || n.id}" has no outgoing flow.`, elementId: n.id });
    if ((/endevent$/i.test(n.type) || n.type === 'workflow:endEvent') && out > 0) issues.push({ level: 'error', message: `End event "${n.name || n.id}" must not have outgoing sequence flows.`, elementId: n.id });
    if ((/endevent$/i.test(n.type) || n.type === 'workflow:endEvent') && inc === 0) issues.push({ level: 'warning', message: `End event "${n.name || n.id}" has no incoming flow.`, elementId: n.id });
    const cat = categoryOf(n.type); if ((cat === 'task' || cat === 'gateway') && inc === 0 && out === 0) issues.push({ level: 'warning', message: `"${n.name || n.id}" is not connected to anything.`, elementId: n.id });
    if (cat === 'gateway' && inc + out < 2) issues.push({ level: 'warning', message: `Gateway "${n.name || n.id}" should split or merge flows.`, elementId: n.id });
    const propsIssues = validateProperties(n.type, n.properties || {}); for (const x of propsIssues) issues.push({ ...x, elementId: n.id });
    const allowed = applicableExtensions(n.type); const p: any = n.properties || {}; for (const key of Object.keys(p)) { if (key.startsWith('palmyra.') && !allowed.includes(key.slice(8))) issues.push({ level: 'error', message: `Extension ${key.slice(8)} is not applicable to ${n.type.replace('workflow:', '')}.`, elementId: n.id }); }
  }

  const pools = nodes.filter(n => n.type === 'workflow:pool');
  const lanes = nodes.filter(n => n.type === 'workflow:lane');
  const hasContainerModel = pools.length > 0 || lanes.length > 0;
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const containerTypes = new Set(['workflow:pool', 'workflow:lane', 'workflow:subProcess', 'workflow:adHocSubProcess', 'workflow:transaction']);
  const isFlowNode = (n: any) => categoryOf(n.type) === 'event' || categoryOf(n.type) === 'task' || categoryOf(n.type) === 'gateway';
  const findPool = (n: any) => {
    if (n?.type === 'workflow:pool') return n;
    let current: any = n;
    while (current?.parent) {
      const parent = nodeById.get(current.parent);
      if (!parent) break;
      if (parent.type === 'workflow:pool') return parent;
      current = parent;
    }
    return undefined;
  };
  if (hasContainerModel) {
    for (const n of nodes) {
      if (n.type === 'workflow:pool') {
        if (n.parent) issues.push({ level: 'error', message: `Pool "${n.name || n.id}" cannot be inside another element.`, elementId: n.id });
        continue;
      }
      if (n.type === 'workflow:lane') {
        const parent = n.parent ? nodeById.get(n.parent) : undefined;
        if (!parent || parent.type !== 'workflow:pool') issues.push({ level: 'error', message: `Lane "${n.name || n.id}" must be inside a Pool.`, elementId: n.id });
        continue;
      }
      if (!isFlowNode(n)) continue;
      const pool = findPool(n);
      if (!pool) issues.push({ level: 'error', message: `Element "${n.name || n.id}" must be inside a Pool/Lane when the workflow uses Pool/Lane containers.`, elementId: n.id });
      if (n.parent && n.type !== 'workflow:boundaryEvent') {
        const parent = nodeById.get(n.parent);
        if (parent && !containerTypes.has(parent.type)) issues.push({ level: 'error', message: `Element "${n.name || n.id}" has invalid parent "${parent.name || parent.id}".`, elementId: n.id });
      }
    }
  }
  // geometry: children inside their pool / lane / sub-process, lanes tile their pool without overlap
  const TOL = 1;
  const collapsedSubProcessTypes = new Set([
    'workflow:subProcess',
    'workflow:adHocSubProcess',
    'workflow:transaction',
  ]);
  for (const n of nodes) {
    const parent = n.parent ? nodeById.get(n.parent) : undefined;
    if (!parent || !containerTypes.has(parent.type) || n.type === 'workflow:boundaryEvent') continue;
    // A collapsed sub-process intentionally keeps its children at their expanded
    // coordinates while hiding them. Its 100x80 collapsed bounds must therefore
    // not be used for child-containment validation.
    if (collapsedSubProcessTypes.has(parent.type) && parent.properties?.isExpanded === false) continue;
    const inside = n.x >= parent.x - TOL && n.y >= parent.y - TOL && n.x + n.width <= parent.x + parent.width + TOL && n.y + n.height <= parent.y + parent.height + TOL;
    if (!inside) issues.push({ level: 'error', message: `"${n.name || n.id}" lies outside its ${parent.type.replace('workflow:', '')} "${parent.name || parent.id}".`, elementId: n.id });
  }
  for (const pool of pools) {
    const own = lanes.filter(l => l.parent === pool.id).sort((a, b) => a.y - b.y);
    for (let i = 1; i < own.length; i++) {
      if (own[i].y < own[i - 1].y + own[i - 1].height - TOL) issues.push({ level: 'error', message: `Lanes "${own[i - 1].name || own[i - 1].id}" and "${own[i].name || own[i].id}" overlap.`, elementId: own[i].id });
    }
  }
  for (const e of edges) {
    const source = nodeById.get(e.source);
    const target = nodeById.get(e.target);
    if (!source || !target) continue;
    const sourcePool = findPool(source)?.id;
    const targetPool = findPool(target)?.id;
    if (e.type === 'workflow:sequenceFlow' && sourcePool !== targetPool) {
      issues.push({ level: 'error', message: `Sequence flow "${e.id}" cannot cross Pool boundaries. Use Message Flow between different Pools.`, elementId: e.id });
    }
    if (e.type === 'workflow:messageFlow' && sourcePool && targetPool && sourcePool === targetPool) {
      issues.push({ level: 'error', message: `Message flow "${e.id}" must connect elements in different Pools.`, elementId: e.id });
    }
  }

  for (const e of edges) {
    if (!nodes.some(n => n.id === e.source)) issues.push({ level: 'error', message: `Flow "${e.id}" references missing source "${e.source}".`, elementId: e.id });
    if (!nodes.some(n => n.id === e.target)) issues.push({ level: 'error', message: `Flow "${e.id}" references missing target "${e.target}".`, elementId: e.id });
    if (e.type === 'workflow:sequenceFlow' && e.source === e.target) issues.push({ level: 'error', message: `Sequence flow "${e.id}" cannot connect an element to itself.`, elementId: e.id });
    if (!e.waypoints?.length) issues.push({ level: 'warning', message: `Flow "${e.id}" has no DI waypoints.`, elementId: e.id });
  }
  return issues;
}
