import { WorkflowType, categoryOf } from '../types';

export const LABEL_WIDTH = 90;
export const LABEL_LINE_HEIGHT = 14;
const CHAR_WIDTH = 6.3;
const LABEL_GAP = 4;

export const isLabeledConnection = (element: any): boolean =>
  !!element &&
  !!element.waypoints &&
  (element.type === 'workflow:sequenceFlow' || element.type === 'workflow:messageFlow');

export const hasExternalLabel = (element: any): boolean =>
  !!element &&
  !element.labelTarget &&
  !!element.type &&
  (isLabeledConnection(element) ||
    (!element.waypoints && ['event', 'gateway', 'data'].includes(categoryOf(element.type as WorkflowType))));

export function wrapText(text: string, maxWidth: number, charWidth: number, maxLines: number): string[] {
  const perLine = Math.max(3, Math.floor(maxWidth / charWidth));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  const push = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };
  for (let word of words) {
    while (word.length > perLine) {
      push();
      lines.push(word.slice(0, perLine));
      word = word.slice(perLine);
    }
    if (!current) current = word;
    else if ((current + ' ' + word).length <= perLine) current += ' ' + word;
    else {
      push();
      current = word;
    }
  }
  push();
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1];
    kept[maxLines - 1] = (last.length >= perLine ? last.slice(0, perLine - 1) : last) + '\u2026';
    return kept;
  }
  return lines;
}

export const labelLines = (name: string, width = LABEL_WIDTH) => wrapText(name, width - 6, CHAR_WIDTH, 12);

export const labelHeight = (name: string, width = LABEL_WIDTH) =>
  Math.max(20, labelLines(name, width).length * LABEL_LINE_HEIGHT + 6);

export function defaultLabelBounds(element: any, name: string) {
  const width = LABEL_WIDTH;
  return {
    x: Math.round(element.x + element.width / 2 - width / 2),
    y: element.y + element.height + LABEL_GAP,
    width,
    height: labelHeight(name, width),
  };
}

export function connectionLabelAnchor(waypoints: Array<{ x: number; y: number }>) {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++)
    total += Math.hypot(waypoints[i].x - waypoints[i - 1].x, waypoints[i].y - waypoints[i - 1].y);
  let acc = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1],
      b = waypoints[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + seg >= total / 2) {
      const t = seg === 0 ? 0 : (total / 2 - acc) / seg;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        horizontal: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y),
      };
    }
    acc += seg;
  }
  const p = waypoints[waypoints.length - 1] || { x: 0, y: 0 };
  return { x: p.x, y: p.y, horizontal: true };
}

export function connectionLabelSize(name: string) {
  const lines = labelLines(name);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const width = Math.min(LABEL_WIDTH, Math.max(24, Math.ceil(longest * CHAR_WIDTH) + 10));
  return { width, height: labelHeight(name, width) };
}

export function defaultConnectionLabelBounds(connection: any, name: string) {
  const a = connectionLabelAnchor(connection.waypoints);
  const { width, height } = connectionLabelSize(name);
  return a.horizontal
    ? { x: Math.round(a.x - width / 2), y: Math.round(a.y - height - 2), width, height }
    : { x: Math.round(a.x + 6), y: Math.round(a.y - height / 2), width, height };
}
