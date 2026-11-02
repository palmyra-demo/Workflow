import { COLLAPSED_SIZE, EXPANDED_SIZE, isCollapsedSub, isShape } from '../pool/poolUtils';

const PADDING = 30; // room around content when there is no remembered size
const MARGIN = 10;  // content must stay at least this far inside

type Box = { x: number; y: number; width: number; height: number };

/**
 * Collapse / expand a sub-process (same idea as bpmn.io / Camunda Modeler):
 *  - collapsing shrinks the shape to a 100×80 box (around its centre) and remembers the expanded size,
 *    the content stays where it is but is hidden (see SubProcessView);
 *  - expanding gives the shape its old size back (always large enough for its content).
 * Everything is done with ordinary modeling commands inside this one command, so it is a single Undo step.
 */
export default class ToggleCollapseHandler {
  static $inject = ['modeling'];

  constructor(private modeling: any) {}

  preExecute(context: { shape: any }): void {
    const { shape } = context;
    if (isCollapsedSub(shape)) this.expand(shape); else this.collapse(shape);
  }

  execute(): any[] { return []; }
  revert(): any[] { return []; }

  private collapse(shape: any): void {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const next: Box = { x: Math.round(cx - COLLAPSED_SIZE.width / 2), y: Math.round(cy - COLLAPSED_SIZE.height / 2), ...COLLAPSED_SIZE };
    const expandedBounds = { dx: shape.x - next.x, dy: shape.y - next.y, width: shape.width, height: shape.height };
    this.modeling.updateProperties(shape, { isExpanded: false, expandedBounds });
    this.resize(shape, next);
  }

  private expand(shape: any): void {
    const eb = shape.businessObject?.expandedBounds;
    const kids = this.content(shape);
    let next: Box;

    if (eb) {
      next = { x: shape.x + eb.dx, y: shape.y + eb.dy, width: eb.width, height: eb.height };
    } else {
      // collapsed elsewhere (e.g. imported): grow around the collapsed box and bring the content here
      const bb = this.bbox(kids);
      const width = Math.max(EXPANDED_SIZE.width, bb ? bb.width + 2 * PADDING : 0);
      const height = Math.max(EXPANDED_SIZE.height, bb ? bb.height + 2 * PADDING : 0);
      const cx = shape.x + shape.width / 2, cy = shape.y + shape.height / 2;
      next = { x: Math.round(cx - width / 2), y: Math.round(cy - height / 2), width, height };
      if (bb) {
        const delta = { x: Math.round(next.x + next.width / 2 - (bb.x + bb.width / 2)), y: Math.round(next.y + next.height / 2 - (bb.y + bb.height / 2)) };
        if (delta.x || delta.y) this.modeling.moveElements(kids, delta, shape, { autoResize: false });
      }
    }

    // never smaller than what is inside (content may have been edited while the sub-process was open)
    const bb = this.bbox(this.content(shape));
    if (bb) {
      // only grow on the sides where content sticks out (with a little margin); anything inside stays untouched
      const left = bb.x < next.x ? bb.x - MARGIN : next.x, top = bb.y < next.y ? bb.y - MARGIN : next.y;
      const right = bb.x + bb.width > next.x + next.width ? bb.x + bb.width + MARGIN : next.x + next.width;
      const bottom = bb.y + bb.height > next.y + next.height ? bb.y + bb.height + MARGIN : next.y + next.height;
      next = { x: left, y: top, width: right - left, height: bottom - top };
    }

    this.modeling.updateProperties(shape, { isExpanded: true, expandedBounds: undefined });
    this.resize(shape, next);
  }

  /** resize + keep boundary events at the same relative place on the border */
  private resize(shape: any, next: Box): void {
    const old: Box = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    const boundary = (shape.children || []).filter((c: any) => c.type === 'workflow:boundaryEvent');
    this.modeling.resizeShape(shape, next, undefined, { autoResize: false });
    for (const b of boundary) {
      const fx = (b.x + b.width / 2 - old.x) / old.width;
      const fy = (b.y + b.height / 2 - old.y) / old.height;
      const delta = { x: Math.round(next.x + fx * next.width - (b.x + b.width / 2)), y: Math.round(next.y + fy * next.height - (b.y + b.height / 2)) };
      if (delta.x || delta.y) this.modeling.moveShape(b, delta, shape, { autoResize: false });
    }
  }

  /** shapes that live inside the sub-process (not labels, connections or boundary events) */
  private content(shape: any): any[] {
    return (shape.children || []).filter((c: any) => isShape(c) && c.type !== 'workflow:boundaryEvent');
  }

  private bbox(shapes: any[]): Box | null {
    if (!shapes.length) return null;
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const s of shapes) {
      l = Math.min(l, s.x); t = Math.min(t, s.y); r = Math.max(r, s.x + s.width); b = Math.max(b, s.y + s.height);
      for (const label of s.labels || []) { l = Math.min(l, label.x); t = Math.min(t, label.y); r = Math.max(r, label.x + label.width); b = Math.max(b, label.y + label.height); }
    }
    return { x: l, y: t, width: r - l, height: b - t };
  }
}
