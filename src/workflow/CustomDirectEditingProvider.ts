import { isWorkflowElement } from './types';
import { defaultConnectionLabelBounds, defaultLabelBounds, hasExternalLabel, isLabeledConnection } from './labels/labelUtils';
import { POOL_HEADER, isLane, isPool } from './pool/poolUtils';

export default class CustomDirectEditingProvider {
  static $inject = ['eventBus', 'canvas', 'directEditing', 'modeling'];

  private canvas: any;
  private modeling: any;

  constructor(eventBus: any, canvas: any, directEditing: any, modeling: any) {
    this.canvas = canvas;
    this.modeling = modeling;

    directEditing.registerProvider(this);

    eventBus.on(['canvas.viewbox.changing', 'drag.init', 'popupMenu.open'], () => {
      if (directEditing.isActive()) directEditing.complete();
    });

    

    let hidden: any = null;
    eventBus.on('directEditing.activate', () => {
      const el = directEditing._active?.element;
      const target = el && (el.labelTarget ? el : (el.labels || [])[0] || el);
      if (!target) return;
      hidden = target;
      try { 
        canvas.addMarker(target, 'workflow-editing'); }
       catch { /* element may be gone */ }
    });
    eventBus.on('directEditing.deactivate', () => {
      if (!hidden) return;
      try { canvas.removeMarker(hidden, 'workflow-editing'); } catch { /* element may be gone */ }
      hidden = null;
    });

    eventBus.on('directEditing.activate', () => {
      const active = directEditing._active?.element;
      const parent = directEditing._textbox?.parent;
      if (parent && active && (isPool(active) || isLane(active))) parent.style.transform = 'rotate(-90deg)';
    });

    const editNew = (shape: any) => {
      if (!shape || shape.waypoints || isLane(shape) || shape.type === 'workflow:group' || !isWorkflowElement(shape)) return;
      try { directEditing.activate(shape); } catch { }
    };
    eventBus.on('autoPlace.end', 500, (e: any) => editNew(e.shape));
    eventBus.on('create.end', 500, (e: any) => {
      const c = e.context || {};
      if (!c.canExecute || (c.elements && c.elements.length > 1)) return;
      editNew(c.shape);
    });

    eventBus.on('element.dblclick', 1000, (event: any) => {
      if (isWorkflowElement(event.element) || event.element?.labelTarget) {
        directEditing.activate(event.element);
        return false;
      }
    });
  }

  activate(element: any): any {
    const target = element.labelTarget || element;
    if (!isWorkflowElement(target) && !isLabeledConnection(target)) return undefined;

    const bo = target.businessObject || {};
    const text = bo.name || '';

    if (hasExternalLabel(target)) {
      const label = (target.labels || [])[0];
      const b = label
        ? { x: label.x, y: label.y, width: label.width, height: label.height }
        : isLabeledConnection(target) ? defaultConnectionLabelBounds(target, 'MMMMMMMMMMMMMM') : defaultLabelBounds(target, 'M');
      return {
        text,
        bounds: this.toScreen(b),
        options: { autoResize: true },
        style: { fontSize: `${12 * this.canvas.viewbox().scale}px`, fontFamily: 'inherit', textAlign: 'center', lineHeight: '1.17', padding: '3px' },
      };
    }
    element = target;

    const header = isPool(element) || isLane(element);
    const scale = this.canvas.viewbox().scale;
    const annotation = element.type === 'workflow:textAnnotation';
    return {
      text,
      bounds: header ? this.getHeaderBounds(element) : this.getInnerBounds(element),
      options: header ? { centerVertically: true } : { centerVertically: !annotation },
      style: {
        fontSize: `${12 * scale}px`,
        fontFamily: 'inherit',
        textAlign: annotation ? 'left' : 'center',
        lineHeight: '1.17',
      },
    };
  }

  update(element: any, newText: string): void {
    this.modeling.updateProperties(element.labelTarget || element, { name: newText });
  }

  private getHeaderBounds(element: any) {
    const { x: vx, y: vy, scale } = this.canvas.viewbox();
    const cx = element.x + POOL_HEADER / 2, cy = element.y + element.height / 2;
    const w = Math.max(60, element.height - 8), h = POOL_HEADER - 4;
    return { x: (cx - w / 2 - vx) * scale, y: (cy - h / 2 - vy) * scale, width: w * scale, height: h * scale };
  }

  private toScreen(b: { x: number; y: number; width: number; height: number }) {
    const { x: vx, y: vy, scale } = this.canvas.viewbox();
    return { x: (b.x - vx) * scale, y: (b.y - vy) * scale, width: b.width * scale, height: b.height * scale };
  }

  private getInnerBounds(element: any) {
    const inset = 6;
    return this.toScreen({
      x: element.x + inset,
      y: element.y + inset,
      width: Math.max(30, element.width - 2 * inset),
      height: Math.max(20, element.height - 2 * inset),
    });
  }

  // private getBounds(element: any) {
  //   const viewbox = this.canvas.viewbox();
  //   const zoom = viewbox.scale;

  //   const isConnectionLike = !!element.waypoints;
  //   const mid = isConnectionLike
  //     ? getConnectionLabelPosition(element.waypoints)
  //     : { x: element.x + element.width / 2, y: element.y + element.height / 2 };

  //   const width = isConnectionLike ? 100 : element.width;
  //   const height = isConnectionLike ? 24 : element.height;
  //   const x = mid.x - width / 2;
  //   const y = mid.y - height / 2;

  //   return {
  //     x: (x - viewbox.x) * zoom,
  //     y: (y - viewbox.y) * zoom,
  //     width: width * zoom,
  //     height: height * zoom,
  //   };
  // }
}
