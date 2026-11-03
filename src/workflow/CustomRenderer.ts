import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { append as svgAppend, create as svgCreate, attr as svgAttr } from 'tiny-svg';

import { WorkflowType, categoryOf, isWorkflowElement } from './types';
import { POOL_HEADER, isCollapsedSub, isSubProcessLike } from './pool/poolUtils';
import { LABEL_LINE_HEIGHT, labelLines, wrapText } from './labels/labelUtils';

const HIGH_PRIORITY = 1500;

const COLORS: Record<string, { stroke: string; fill: string }> = {
  event: { stroke: '#2f7d3a', fill: '#e9f7ec' },
  task: { stroke: '#3061c4', fill: '#eef3fd' },
  gateway: { stroke: '#c48a1a', fill: '#fdf6e6' },
  data: { stroke: '#6b6b6b', fill: '#f4f4f4' },
  container: { stroke: '#555', fill: '#ffffff' },
  connection: { stroke: '#333', fill: 'none' },
};

const TASK_ICON: Partial<Record<WorkflowType, string>> = {
  'workflow:userTask': '☺',
  'workflow:serviceTask': '⚙',
  'workflow:manualTask': '✋',
  'workflow:scriptTask': '≣',
  'workflow:businessRuleTask': '▤',
  'workflow:sendTask': '✉',
  'workflow:receiveTask': '✆',
  'workflow:subProcess': '⊞',
  'workflow:callActivity': '⊕',
};

const MARKER = 14;
const MARKER_GAP = 6;

export function subProcessMarkers(element: any): {
  adHoc?: { x: number; y: number };
  plus?: { x: number; y: number };
} {
  const adHoc = element.type === 'workflow:adHocSubProcess';
  const plus = isCollapsedSub(element);
  const n = (adHoc ? 1 : 0) + (plus ? 1 : 0);
  const total = n * MARKER + Math.max(0, n - 1) * MARKER_GAP;
  let x = (element.width - total) / 2;
  const y = element.height - MARKER - 6;
  const out: { adHoc?: { x: number; y: number }; plus?: { x: number; y: number } } = {};
  if (adHoc) {
    out.adHoc = { x, y };
    x += MARKER + MARKER_GAP;
  }
  if (plus) out.plus = { x, y };
  return out;
}

export function plusMarkerBox(element: any): { x: number; y: number; width: number; height: number } | null {
  const p = subProcessMarkers(element).plus;
  return p ? { x: p.x - 5, y: p.y - 5, width: MARKER + 10, height: MARKER + 10 } : null;
}

export default class CustomRenderer extends (BaseRenderer as any) {
  static $inject = ['eventBus'];

  constructor(eventBus: any) {
    super(eventBus, HIGH_PRIORITY);
  }

  canRender(element: any): boolean {
    return isWorkflowElement(element) || !!element.labelTarget;
  }

  drawShape(parentNode: SVGElement, element: any): SVGElement {
    const type = element.type as WorkflowType;
    const category = categoryOf(type);
    const colors = COLORS[category] || COLORS.task;
    const { width, height } = element;
    const bo = element.businessObject || {};

    if (element.labelTarget) return this.drawLabel(parentNode, element);

    let visual: SVGElement;

    if (type === 'workflow:pool' || type === 'workflow:lane')
      return this.drawContainer(parentNode, element, bo);
    if (isSubProcessLike(element)) return this.drawSubProcess(parentNode, element, bo);

    if (category === 'event') {
      visual = svgCreate('circle');
      svgAttr(visual, {
        cx: width / 2,
        cy: height / 2,
        r: Math.min(width, height) / 2 - 2,
        stroke: colors.stroke,
        'stroke-width': type === 'workflow:endEvent' ? 4 : 2,
        fill: colors.fill,
      });
      svgAppend(parentNode, visual);
      const eventGlyph = this.eventGlyph(type, bo);
      if (eventGlyph) this.drawGlyph(parentNode, width / 2, height / 2, eventGlyph, colors.stroke, 14);
      return visual;
    }

    if (category === 'gateway') {
      const cx = width / 2;
      const cy = height / 2;
      visual = svgCreate('polygon');
      svgAttr(visual, {
        points: `${cx},2 ${width - 2},${cy} ${cx},${height - 2} 2,${cy}`,
        stroke: colors.stroke,
        'stroke-width': 2,
        fill: colors.fill,
      });
      svgAppend(parentNode, visual);
      this.drawGlyph(parentNode, cx, cy, this.gatewayGlyph(type), colors.stroke, 20);
      return visual;
    }

    if (category === 'data') {
      visual = svgCreate('path');
      const d =
        type === 'workflow:dataStore' ? this.cylinderPath(width, height) : this.notePath(width, height);
      svgAttr(visual, {
        d,
        stroke: colors.stroke,
        'stroke-width': 2,
        fill: colors.fill,
      });
      svgAppend(parentNode, visual);
      return visual;
    }

    if (category === 'artifact') {
      visual = svgCreate(type === 'workflow:textAnnotation' ? 'path' : 'rect');
      if (type === 'workflow:textAnnotation') {
        svgAttr(visual, {
          d: `M4,0 L${width - 4},0 M4,0 L4,${height}`,
          stroke: colors.stroke,
          'stroke-width': 2,
          fill: 'none',
        });
      } else {
        svgAttr(visual, {
          x: 0,
          y: 0,
          width,
          height,
          fill: 'none',
          stroke: colors.stroke,
          'stroke-width': 2,
          'stroke-dasharray': '6,4',
        });
      }
      svgAppend(parentNode, visual);
      this.drawLabelInside(parentNode, element, bo.name || '');
      return visual;
    }

    visual = svgCreate('rect');
    svgAttr(visual, {
      x: 0,
      y: 0,
      width,
      height,
      rx: 8,
      ry: 8,
      stroke: colors.stroke,
      'stroke-width': 2,
      fill: colors.fill,
    });
    svgAppend(parentNode, visual);

    const icon = TASK_ICON[type];
    if (icon) {
      this.drawGlyph(parentNode, 14, 16, icon, colors.stroke, 14);
    }
    this.drawLabelInside(parentNode, element, bo.name || '');
    return visual;
  }

  drawConnection(parentNode: SVGElement, element: any): SVGElement {
    const type = element.type as WorkflowType;
    const waypoints: Array<{ x: number; y: number }> = element.waypoints || [];
    const points = waypoints.map((p) => `${p.x},${p.y}`).join(' ');

    const line = svgCreate('polyline');
    const dashed =
      type === 'workflow:messageFlow' ||
      type === 'workflow:association' ||
      type === 'workflow:dataAssociation';
    svgAttr(line, {
      points,
      stroke: COLORS.connection.stroke,
      'stroke-width': 2,
      fill: 'none',
      ...(dashed ? { 'stroke-dasharray': '6,5' } : {}),
    });
    svgAppend(parentNode, line);

    if (waypoints.length >= 2 && type !== 'workflow:association') {
      const last = waypoints[waypoints.length - 1];
      const prev = waypoints[waypoints.length - 2];
      svgAppend(parentNode, this.arrowHead(prev, last, type === 'workflow:messageFlow'));
    }

    return line;
  }

  private drawSubProcess(parentNode: SVGElement, element: any, bo: any): SVGElement {
    const { width, height } = element;
    const collapsed = isCollapsedSub(element);
    const colors = COLORS.task;

    const body = svgCreate('rect');
    svgAttr(body, {
      x: 0,
      y: 0,
      width,
      height,
      rx: 10,
      ry: 10,
      stroke: colors.stroke,
      'stroke-width': 2,
      fill: collapsed ? colors.fill : '#fbfcff',
    });
    svgAppend(parentNode, body);

    if (element.type === 'workflow:transaction') {
      const inner = svgCreate('rect');
      svgAttr(inner, {
        x: 4,
        y: 4,
        width: width - 8,
        height: height - 8,
        rx: 7,
        ry: 7,
        stroke: colors.stroke,
        'stroke-width': 1.5,
        fill: 'none',
        'pointer-events': 'none',
      });
      svgAppend(parentNode, inner);
    }

    const name = (bo.name || '').trim();
    if (name) {
      if (collapsed) this.drawLabelInside(parentNode, element, name);
      else this.drawLabelTop(parentNode, element, name);
    }

    const markers = subProcessMarkers(element);
    if (markers.adHoc) {
      const g = svgCreate('g');
      svgAttr(g, {
        transform: `translate(${markers.adHoc.x}, ${markers.adHoc.y})`,
        class: 'workflow-marker-adhoc',
        'pointer-events': 'none',
      });
      const tilde = svgCreate('path');
      svgAttr(tilde, {
        d: 'M1,9.5 C3.5,3 5.5,3 7,7 C8.5,11 10.5,11 13,4.5',
        stroke: colors.stroke,
        'stroke-width': 2,
        fill: 'none',
        'stroke-linecap': 'round',
      });
      svgAppend(g, tilde);
      svgAppend(parentNode, g);
    }
    if (markers.plus) {
      const g = svgCreate('g');
      svgAttr(g, {
        transform: `translate(${markers.plus.x}, ${markers.plus.y})`,
        class: 'workflow-marker-plus',
        'pointer-events': 'none',
      });
      const box = svgCreate('rect');
      svgAttr(box, {
        x: 0,
        y: 0,
        width: MARKER,
        height: MARKER,
        rx: 2,
        ry: 2,
        stroke: colors.stroke,
        'stroke-width': 1.5,
        fill: '#ffffff',
      });
      const plus = svgCreate('path');
      svgAttr(plus, {
        d: 'M7,3.5 V10.5 M3.5,7 H10.5',
        stroke: colors.stroke,
        'stroke-width': 1.6,
        fill: 'none',
        'stroke-linecap': 'round',
      });
      svgAppend(g, box);
      svgAppend(g, plus);
      svgAppend(parentNode, g);
    }
    return body;
  }

  private drawLabelTop(parent: SVGElement, element: any, name: string) {
    const fontSize = 12,
      lineHeight = 14;
    const lines = wrapText(name, Math.max(24, element.width - 24), fontSize * 0.54, 2);
    const t = svgCreate('text');
    svgAttr(t, {
      class: 'workflow-label',
      'font-size': fontSize,
      'font-weight': 600,
      'text-anchor': 'middle',
      fill: '#1a1a1a',
      'pointer-events': 'none',
    });
    lines.forEach((line, i) => {
      const tspan = svgCreate('tspan');
      svgAttr(tspan, { x: element.width / 2, y: 8 + fontSize + i * lineHeight });
      tspan.textContent = line;
      svgAppend(t, tspan);
    });
    const title = svgCreate('title');
    title.textContent = name;
    svgAppend(t, title);
    svgAppend(parent, t);
  }

  private drawContainer(parentNode: SVGElement, element: any, bo: any): SVGElement {
    const { width, height } = element;
    const isPool = element.type === 'workflow:pool';
    const stroke = '#555';

    const body = svgCreate('rect');
    svgAttr(body, {
      x: 0,
      y: 0,
      width,
      height,
      fill: '#ffffff',
      'fill-opacity': 1,
      stroke,
      'stroke-width': isPool ? 2 : 1.5,
    });
    svgAppend(parentNode, body);

    const header = svgCreate('rect');
    svgAttr(header, {
      x: 0,
      y: 0,
      width: POOL_HEADER,
      height,
      fill: isPool ? '#eceff4' : '#f6f7fa',
      stroke,
      'stroke-width': isPool ? 2 : 1.5,
    });
    svgAppend(parentNode, header);

    const name = (bo.name || '').trim();
    if (name) {
      const fontSize = 12,
        lineHeight = 14;
      const maxLines = Math.max(1, Math.floor((POOL_HEADER - 4) / lineHeight));
      const lines = wrapText(name, Math.max(24, height - 16), fontSize * 0.58, maxLines);
      const text = svgCreate('text');
      svgAttr(text, {
        class: 'workflow-label',
        transform: `translate(${POOL_HEADER / 2}, ${height / 2}) rotate(-90)`,
        'text-anchor': 'middle',
        'font-size': fontSize,
        fill: '#222',
        'font-weight': isPool ? 600 : 400,
        'pointer-events': 'none',
      });
      lines.forEach((line, i) => {
        const tspan = svgCreate('tspan');
        svgAttr(tspan, { x: 0, y: (i - (lines.length - 1) / 2) * lineHeight + fontSize * 0.35 });
        tspan.textContent = line;
        svgAppend(text, tspan);
      });
      const title = svgCreate('title');
      title.textContent = name;
      svgAppend(text, title);
      svgAppend(parentNode, text);
    }
    return body;
  }

  getShapePath(shape: any): string {
    const { x, y, width, height } = shape;
    const category = categoryOf(shape.type as WorkflowType);

    if (category === 'event') {
      const r = Math.min(width, height) / 2 - 1;
      const cx = x + width / 2,
        cy = y + height / 2;
      return `M${cx - r},${cy}a${r},${r} 0 1,1 ${2 * r},0a${r},${r} 0 1,1 ${-2 * r},0z`;
    }
    if (category === 'gateway') {
      const cx = x + width / 2,
        cy = y + height / 2;
      return `M${cx},${y + 1}L${x + width - 1},${cy}L${cx},${y + height - 1}L${x + 1},${cy}Z`;
    }
    return `M${x},${y}l${width},0l0,${height}l${-width},0z`;
  }

  getConnectionPath(connection: any): string {
    const wps: Array<{ x: number; y: number }> = connection.waypoints || [];
    return wps.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join('');
  }

  private eventGlyph(type: WorkflowType, bo: any = {}): string {
    const source = `${type} ${bo.bpmnType || ''} ${bo.eventType || ''}`;
    if (source.includes('message')) return '✉';
    if (source.includes('timer')) return '◷';
    if (source.includes('signal')) return '△';
    if (source.includes('error')) return '⚡';
    if (source.includes('conditional')) return '⌁';
    if (source.includes('escalation')) return '⇧';
    if (source.includes('compensation')) return '↶';
    if (source.includes('link')) return '↗';
    if (source.includes('multiple')) return '✣';
    if (source.includes('cancel')) return '⊘';
    if (source.includes('terminate')) return '⊗';
    return '';
  }

  private gatewayGlyph(type: WorkflowType): string {
    switch (type) {
      case 'workflow:parallelGateway':
        return '＋';
      case 'workflow:inclusiveGateway':
        return '◯';
      case 'workflow:eventBasedGateway':
        return '◈';
      default:
        return '✕';
    }
  }

  private drawGlyph(parent: SVGElement, x: number, y: number, glyph: string, color: string, size: number) {
    const t = svgCreate('text');
    svgAttr(t, {
      x,
      y: y + size / 3,
      'font-size': size,
      'text-anchor': 'middle',
      fill: color,
    });
    t.textContent = glyph;
    svgAppend(parent, t);
  }

  private drawLabelInside(parent: SVGElement, element: any, name: string) {
    if (!name) return;
    const annotation = element.type === 'workflow:textAnnotation';
    const padX = annotation ? 10 : 8,
      padY = 6;
    const fontSize = 12,
      lineHeight = 14;
    const maxLines = Math.max(1, Math.floor((element.height - 2 * padY) / lineHeight));
    const lines = wrapText(name, Math.max(24, element.width - 2 * padX), fontSize * 0.54, maxLines);

    const t = svgCreate('text');
    svgAttr(t, {
      class: 'workflow-label',
      'font-size': fontSize,
      'text-anchor': annotation ? 'start' : 'middle',
      fill: '#1a1a1a',
      'pointer-events': 'none',
    });
    const top = element.height / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;
    lines.forEach((line, i) => {
      const tspan = svgCreate('tspan');
      svgAttr(tspan, { x: annotation ? padX : element.width / 2, y: top + i * lineHeight });
      tspan.textContent = line;
      svgAppend(t, tspan);
    });
    const title = svgCreate('title');
    title.textContent = name;
    svgAppend(t, title);
    svgAppend(parent, t);
  }

  private drawLabel(parentNode: SVGElement, element: any): SVGElement {
    const name = String(element.labelTarget?.businessObject?.name || '');
    const box = svgCreate('rect');
    svgAttr(box, { x: 0, y: 0, width: element.width, height: element.height, fill: 'none', stroke: 'none' });
    svgAppend(parentNode, box);
    const text = svgCreate('text');
    svgAttr(text, {
      class: 'workflow-label',
      'font-size': 12,
      'text-anchor': 'middle',
      fill: '#1a1a1a',
      'pointer-events': 'none',
    });
    labelLines(name, element.width).forEach((line, i) => {
      const tspan = svgCreate('tspan');
      svgAttr(tspan, { x: element.width / 2, y: 4 + 11 + i * LABEL_LINE_HEIGHT });
      tspan.textContent = line;
      svgAppend(text, tspan);
    });
    svgAppend(parentNode, text);
    return box;
  }

  private notePath(w: number, h: number): string {
    const fold = 12;
    return `M0,0 L${w - fold},0 L${w},${fold} L${w},${h} L0,${h} Z M${w - fold},0 L${w - fold},${fold} L${w},${fold}`;
  }

  private cylinderPath(w: number, h: number): string {
    const e = 8;
    return `M0,${e} C0,0 ${w},0 ${w},${e} L${w},${h - e} C${w},${h} 0,${h} 0,${h - e} Z M0,${e} C0,${2 * e} ${w},${2 * e} ${w},${e}`;
  }

  private arrowHead(from: { x: number; y: number }, to: { x: number; y: number }, open = false): SVGElement {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const len = 10;
    const spread = Math.PI / 7;
    const p1 = {
      x: to.x - len * Math.cos(angle - spread),
      y: to.y - len * Math.sin(angle - spread),
    };
    const p2 = {
      x: to.x - len * Math.cos(angle + spread),
      y: to.y - len * Math.sin(angle + spread),
    };
    const poly = svgCreate('polygon');
    svgAttr(poly, {
      points: `${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`,
      fill: open ? 'none' : COLORS.connection.stroke,
      stroke: COLORS.connection.stroke,
    });
    return poly;
  }
}
