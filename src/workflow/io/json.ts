import { WorkflowGraph } from './graph';

export function serializeToJson(graph: WorkflowGraph): string {
  return JSON.stringify({ format: 'workflow-json', version: '1.0', ...graph }, null, 2);
}

export function parseJson(json: string): WorkflowGraph {
  const data = JSON.parse(json);
  if (data?.format === 'workflow-versions') {
    throw new Error('This is a version-history file. Use Version history → Import history instead.');
  }
  return {
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
  };
}
