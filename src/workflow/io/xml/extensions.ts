import { GraphNode } from '../graph';
import { SIMPLE_EXTENSIONS } from './constants';
import { attributes, escapeXml } from './xmlText';

type Props = Record<string, any>;

export const configOf = (node: GraphNode): Props => ({
  ...(node.properties || {}),
  ...(node.properties?.palmyra || {}),
});

function selfClosing(name: string, values: Props, indent: string) {
  return `${indent}<palmyra:${name} ${attributes(values)} />`;
}

function withChildren(name: string, values: Props, indent: string, body: string) {
  return `${indent}<palmyra:${name} ${attributes(values)}>${body}\n${indent}</palmyra:${name}>`;
}

function ioMappingXml(mapping: Props, indent: string) {
  const inner = indent + '  ';
  const toTag = (name: 'input' | 'output') => (item: Props) =>
    selfClosing(name, { source: item.source, target: item.target }, inner);

  const inputs = Array.isArray(mapping.inputs) ? mapping.inputs.map(toTag('input')) : [];
  const outputs = Array.isArray(mapping.outputs) ? mapping.outputs.map(toTag('output')) : [];
  const body = [...inputs, ...outputs].join('\n');

  return withChildren('ioMapping', { outputMode: mapping.outputMode || 'selected' }, indent, body);
}

function taskHeadersXml(headers: Props[], indent: string) {
  const body = headers
    .map((header) => selfClosing('header', { key: header.key, value: header.value }, indent + '  '))
    .join('\n');
  return withChildren('taskHeaders', {}, indent, body);
}

export function extensionXml(node: GraphNode, indent = '        '): string {
  const config = configOf(node);
  const lines: string[] = [];

  for (const name of SIMPLE_EXTENSIONS) {
    if (config[name]) lines.push(selfClosing(name, config[name], indent));
  }
  if (config.ioMapping) lines.push(ioMappingXml(config.ioMapping, indent));
  if (Array.isArray(config.taskHeaders?.headers)) {
    lines.push(taskHeadersXml(config.taskHeaders.headers, indent));
  }

  if (!lines.length) return '';
  return `\n${indent}<bpmn:extensionElements>\n${lines.join('\n')}\n${indent}</bpmn:extensionElements>`;
}

export function eventDefinitionXml(
  node: GraphNode,
  definition: string | undefined,
  indent = '        ',
): string {
  if (!definition) return '';
  const config = configOf(node);
  const empty = `\n${indent}<bpmn:${definition} />`;
  const withRef = (attribute: string, prefix: string) =>
    `\n${indent}<bpmn:${definition} ${attribute}="${prefix}_${escapeXml(node.id)}" />`;

  switch (definition) {
    case 'timerEventDefinition': {
      const timer = config.timer || {};
      const children: string[] = [];
      if (timer.duration)
        children.push(`<bpmn:timeDuration>${escapeXml(timer.duration)}</bpmn:timeDuration>`);
      if (timer.date) children.push(`<bpmn:timeDate>${escapeXml(timer.date)}</bpmn:timeDate>`);
      if (timer.cycle) children.push(`<bpmn:timeCycle>${escapeXml(timer.cycle)}</bpmn:timeCycle>`);
      if (!children.length) return empty;
      const lines = children.map((child) => `${indent}  ${child}`).join('\n');
      return `\n${indent}<bpmn:${definition}>\n${lines}\n${indent}</bpmn:${definition}>`;
    }
    case 'messageEventDefinition':
      return config.message?.name ? withRef('messageRef', 'Message') : empty;
    case 'signalEventDefinition':
      return config.signal?.name ? withRef('signalRef', 'Signal') : empty;
    case 'errorEventDefinition':
      return config.error?.code ? withRef('errorRef', 'Error') : empty;
    default:
      return empty;
  }
}
