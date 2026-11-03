import type { WorkflowGraph } from '../../workflow/io/graph';
import { categoryOf } from '../../workflow/types';
import type { WorkflowVersion } from '../../workflow/versioning/versionStore';

export const dateLabel = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const shortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export const versionName = (version: WorkflowVersion) =>
  `v${version.version}${version.versionTag ? ` · ${version.versionTag}` : ''}`;

export const safeFileName = (text: string) => text.replace(/[^\w.-]+/g, '_');

export const versionFileName = (version: WorkflowVersion) =>
  `workflow-v${version.version}${version.versionTag ? `-${safeFileName(version.versionTag)}` : ''}.json`;

const BREAKDOWN_GROUPS = [
  'Events',
  'Tasks',
  'Sub-processes',
  'Gateways',
  'Data',
  'Pools & lanes',
  'Annotations & groups',
] as const;

const GROUP_BY_CATEGORY = {
  event: 'Events',
  task: 'Tasks',
  gateway: 'Gateways',
  data: 'Data',
  container: 'Pools & lanes',
  artifact: 'Annotations & groups',
  connection: 'Tasks',
} as const;

export function elementBreakdown(graph: WorkflowGraph | null): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const node of graph?.nodes ?? []) {
    const isSubProcess = /(subprocess|transaction)$/i.test(node.type);
    const group = isSubProcess ? 'Sub-processes' : GROUP_BY_CATEGORY[categoryOf(node.type)];
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return BREAKDOWN_GROUPS.filter((group) => counts.has(group)).map((group) => [group, counts.get(group)!]);
}
