import type { WorkflowGraph } from '../workflow/io/graph';
import { parseJson } from '../workflow/io/json';
import { parseXml } from '../workflow/io/xml';
import { errorMessage } from './download';

export type InitialDiagram = { xml: string } | { json: string } | { graph: WorkflowGraph };

export interface ResolvedDiagram {
  graph: WorkflowGraph | null | undefined;
  error?: string;
}

export function resolveInitialDiagram(input: InitialDiagram | null | undefined): ResolvedDiagram {
  if (input === undefined) return { graph: undefined };
  if (input === null) return { graph: null };

  try {
    if ('xml' in input) return { graph: parseXml(input.xml) };
    if ('json' in input) return { graph: parseJson(input.json) };
    return { graph: input.graph };
  } catch (error) {
    return { graph: null, error: `Could not load the initial diagram: ${errorMessage(error)}` };
  }
}
