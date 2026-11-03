import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import {
  CHILD_PADDING,
  LANE_MIN_HEIGHT,
  POOL_HEADER,
  POOL_MIN_HEIGHT,
  POOL_MIN_INNER_WIDTH,
  bboxOf,
  contentDescendants,
  directContent,
  hasPools,
  innerBounds,
  isAncestorOf,
  isCollapsedSub,
  isLane,
  isPool,
  isShape,
  isSubProcessLike,
  lanesOf,
} from './poolUtils';

const INTERNAL = { laneLayout: false, autoResize: false };
const DEFAULT_LANE_HEIGHT = 120;

const centerOf = (b: { x: number; y: number; width: number; height: number }) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});

export default class PoolBehavior extends (CommandInterceptor as any) {
  private moveDepth = 0;
  private reparented = new Set<any>();
  static $inject = ['eventBus', 'modeling', 'elementFactory', 'elementRegistry', 'canvas', 'rules'];

  constructor(
    eventBus: any,
    private modeling: any,
    private elementFactory: any,
    private elementRegistry: any,
    private canvas: any,
    private rules: any,
  ) {
    super(eventBus);

    eventBus.on('shape.move.start', 2000, (e: any) => {
      if (isLane(e.shape) && isPool(e.shape.parent)) e.shape = e.shape.parent;
    });

    eventBus.on(['commandStack.changed', 'elements.changed'], () => this.sendBackgroundsToBack());

    eventBus.on('resize.start', 1500, (e: any) => this.setResizeConstraints(e.context));

    this.preExecute('shape.create', (e: any) => {
      const { shape, hints } = e.context;

      if ((isPool(shape) || isLane(shape)) && e.context.parentIndex === undefined) e.context.parentIndex = 0;
      if (hints?.importing) return;
      if (isPool(shape)) this.prepareCreatePool(e.context);
      else if (isLane(shape)) this.prepareCreateLane(e.context);
    });
    this.postExecuted('shape.create', (e: any) => {
      const c = e.context;
      if (c.adopt?.length)
        this.modeling.moveElements(c.adopt, { x: 0, y: 0 }, c.shape, { autoResize: false });
      if (c.laneContent?.length) this.assignToLanes(c.laneContent, c.parent);
    });

    this.postExecuted('shape.resize', (e: any) => {
      const c = e.context;
      if (c.hints?.laneLayout === false) return;
      if (isPool(c.shape)) this.onPoolResized(c.shape);
      else if (isLane(c.shape)) this.onLaneResized(c);
    });

    this.postExecuted('shape.delete', (e: any) => {
      const c = e.context;
      if (isLane(c.shape) && c.oldParent && isPool(c.oldParent) && this.elementRegistry.get(c.oldParent.id))
        this.closeLaneGap(c.shape, c.oldParent);
    });

    this.preExecute('elements.move', 5000, (e: any) => {
      const c = e.context;
      const np = c.newParent;
      if ((c.shapes || []).length && c.shapes.every((sh: any) => sh.labelTarget)) {
        c.newParent = c.shapes[0].parent;
        return;
      }
      if (np && (c.shapes || []).some((sh: any) => np === sh || isAncestorOf(sh, np)))
        c.newParent = c.shapes[0].parent;
    });
    this.preExecute('elements.move', () => {
      this.moveDepth++;
    });
    this.postExecuted('elements.move', () => {
      if (--this.moveDepth === 0) this.flushReparented();
    });
    this.postExecuted('shape.move', (e: any) => {
      const c = e.context;
      if (c.oldParent && c.shape.parent !== c.oldParent) this.reparented.add(c.shape);
      if (this.moveDepth === 0) this.flushReparented();
    });
  }

  private sendBackgroundsToBack() {
    for (const el of this.elementRegistry.filter((e: any) => isPool(e) || isLane(e))) {
      const gfx = this.canvas.getGraphics(el);
      const group = gfx?.parentNode as Element | null;
      const container = group?.parentNode as Element | null;
      if (!group || !container) continue;
      const first = Array.from(container.children).find((c) => c.classList?.contains('djs-group'));
      if (first && first !== group && !(first.compareDocumentPosition(group) & 2)) {
        const firstOther = Array.from(container.children).find(
          (c) => c.classList?.contains('djs-group') && !this.isBackgroundGroup(c),
        );
        if (firstOther && firstOther.compareDocumentPosition(group) & 4)
          container.insertBefore(group, firstOther);
      }
    }
  }

  private isBackgroundGroup(group: Element): boolean {
    const id = group.querySelector('.djs-element')?.getAttribute('data-element-id');
    const el = id ? this.elementRegistry.get(id) : null;
    return !!el && (isPool(el) || isLane(el));
  }

  private setResizeConstraints(ctx: any) {
    const { shape, direction } = ctx;
    if (isPool(shape)) ctx.resizeConstraints = this.poolConstraints(shape, direction);
    else if (isLane(shape)) ctx.resizeConstraints = this.laneConstraints(shape, direction);
    else if (isSubProcessLike(shape))
      ctx.minDimensions = isCollapsedSub(shape) ? { width: 80, height: 60 } : { width: 120, height: 100 };
    else ctx.minDimensions = { width: 50, height: 40 };
  }

  private poolConstraints(pool: any, dir: string) {
    const cur = { top: pool.y, left: pool.x, right: pool.x + pool.width, bottom: pool.y + pool.height };
    const lanes = lanesOf(pool);
    const all = bboxOf(contentDescendants(pool));
    const min = { ...cur };
    const minW = POOL_HEADER + POOL_MIN_INNER_WIDTH;

    if (/w/.test(dir)) min.left = Math.min(cur.right - minW, all ? all.left - POOL_HEADER - 10 : Infinity);
    if (/e/.test(dir)) min.right = Math.max(cur.left + minW, all ? all.right + CHILD_PADDING : -Infinity);

    const first = lanes[0],
      last = lanes[lanes.length - 1];
    const topBox = bboxOf(contentDescendants(first || pool));
    const bottomBox = bboxOf(contentDescendants(last || pool));
    if (/n/.test(dir)) {
      const laneLimit = first ? first.y + first.height - LANE_MIN_HEIGHT : cur.bottom - POOL_MIN_HEIGHT;
      min.top = Math.min(laneLimit, topBox ? topBox.top - CHILD_PADDING : Infinity);
    }
    if (/s/.test(dir)) {
      const laneLimit = last ? last.y + LANE_MIN_HEIGHT : cur.top + POOL_MIN_HEIGHT;
      min.bottom = Math.max(laneLimit, bottomBox ? bottomBox.bottom + CHILD_PADDING : -Infinity);
    }
    return { min };
  }

  private laneConstraints(lane: any, dir: string) {
    const pool = lane.parent;
    const cur = { top: lane.y, left: lane.x, right: lane.x + lane.width, bottom: lane.y + lane.height };
    const lanes = lanesOf(pool),
      idx = lanes.indexOf(lane);
    const above = lanes[idx - 1],
      below = lanes[idx + 1];
    const own = bboxOf(contentDescendants(lane));
    const poolBox = bboxOf(contentDescendants(pool));
    const min = { ...cur },
      max: any = {};

    if (/n/.test(dir)) {
      min.top = Math.min(cur.bottom - LANE_MIN_HEIGHT, own ? own.top - CHILD_PADDING : Infinity);
      if (above) {
        const box = bboxOf(contentDescendants(above));
        max.top = Math.max(above.y + LANE_MIN_HEIGHT, box ? box.bottom + CHILD_PADDING : -Infinity);
      }
    }
    if (/s/.test(dir)) {
      min.bottom = Math.max(cur.top + LANE_MIN_HEIGHT, own ? own.bottom + CHILD_PADDING : -Infinity);
      if (below) {
        const box = bboxOf(contentDescendants(below));
        max.bottom = Math.min(
          below.y + below.height - LANE_MIN_HEIGHT,
          box ? box.top - CHILD_PADDING : Infinity,
        );
      }
    }
    if (/w/.test(dir))
      min.left = Math.min(cur.right - POOL_MIN_INNER_WIDTH, poolBox ? poolBox.left - 10 : Infinity);
    if (/e/.test(dir))
      min.right = Math.max(
        cur.left + POOL_MIN_INNER_WIDTH,
        poolBox ? poolBox.right + CHILD_PADDING : -Infinity,
      );
    return { min, max };
  }

  private resizeTo(shape: any, b: { x: number; y: number; width: number; height: number }) {
    if (shape.x === b.x && shape.y === b.y && shape.width === b.width && shape.height === b.height) return;
    this.modeling.resizeShape(shape, b, null, INTERNAL);
  }

  private onPoolResized(pool: any) {
    const lanes = lanesOf(pool);
    if (!lanes.length) return;
    const inner = innerBounds(pool);
    lanes.forEach((lane, i) => {
      const top = i === 0 ? pool.y : lane.y;
      const bottom = i === lanes.length - 1 ? pool.y + pool.height : lane.y + lane.height;
      this.resizeTo(lane, { x: inner.x, y: top, width: inner.width, height: bottom - top });
    });
  }

  private onLaneResized(ctx: any) {
    const lane = ctx.shape,
      old = ctx.oldBounds,
      hints = ctx.hints || {};
    const pool = lane.parent;
    if (!isPool(pool)) return;
    const auto = typeof hints.autoResize === 'string' || Array.isArray(hints.autoResize);
    const lanes = lanesOf(pool),
      idx = lanes.indexOf(lane);
    const above = lanes[idx - 1],
      below = lanes[idx + 1];
    const topDelta = old.y - lane.y;
    const bottomDelta = lane.y + lane.height - (old.y + old.height);

    let top = pool.y,
      bottom = pool.y + pool.height;
    if (auto) {
      if (topDelta > 0) {
        const move = lanes.slice(0, idx);
        if (move.length)
          this.modeling.moveElements(move, { x: 0, y: -topDelta }, undefined, { autoResize: false });
        top -= topDelta;
      }
      if (bottomDelta > 0) {
        const move = lanes.slice(idx + 1);
        if (move.length)
          this.modeling.moveElements(move, { x: 0, y: bottomDelta }, undefined, { autoResize: false });
        bottom += bottomDelta;
      }
    } else {
      if (topDelta !== 0) {
        if (above)
          this.resizeTo(above, { x: above.x, y: above.y, width: above.width, height: lane.y - above.y });
        else top = lane.y;
      }
      if (bottomDelta !== 0) {
        const edge = lane.y + lane.height;
        if (below)
          this.resizeTo(below, {
            x: below.x,
            y: edge,
            width: below.width,
            height: below.y + below.height - edge,
          });
        else bottom = edge;
      }
    }

    const left = lane.x - POOL_HEADER;
    this.resizeTo(pool, { x: left, y: top, width: lane.width + POOL_HEADER, height: bottom - top });
    for (const other of lanesOf(pool)) {
      if (other === lane) continue;
      this.resizeTo(other, { x: lane.x, y: other.y, width: lane.width, height: other.height });
    }
  }

  private prepareCreatePool(ctx: any) {
    if (hasPools(this.elementRegistry)) return;
    const root = this.canvas.getRootElement();
    const content = (root.children || []).filter((c: any) => isShape(c) && !isPool(c) && !isLane(c));
    if (!content.length) return;
    const bb = bboxOf(content)!;
    const width = Math.max(bb.right - bb.left + POOL_HEADER + 90, 300);
    const height = Math.max(bb.bottom - bb.top + 80, 140);
    const x = bb.left - POOL_HEADER - 40,
      y = bb.top - 40;
    ctx.shape.width = width;
    ctx.shape.height = height;
    ctx.position = centerOf({ x, y, width, height });
    ctx.adopt = content;
  }

  private newLane(bounds: { x: number; y: number; width: number; height: number }, pool: any, name?: string) {
    const lane = this.elementFactory.createWorkflowShape('workflow:lane', {
      width: bounds.width,
      height: bounds.height,
      name,
    });
    return this.modeling.createShape(lane, centerOf(bounds), pool, { importing: true, autoResize: false });
  }

  private prepareCreateLane(ctx: any) {
    const { shape, hints = {} } = ctx;
    const target = ctx.parent;
    const pool = isPool(target) ? target : target?.parent;
    if (!isPool(pool)) return;
    const lanes = lanesOf(pool);
    const inner = innerBounds(pool);
    ctx.parent = pool;

    if (!lanes.length) {
      const content = directContent(pool);
      const box = bboxOf(content);
      const NEW_MIN = 80;
      let h1 = Math.floor(pool.height / 2);
      if (box) h1 = Math.max(LANE_MIN_HEIGHT, Math.ceil(box.bottom + CHILD_PADDING - pool.y));
      const needed = h1 + (box ? NEW_MIN : LANE_MIN_HEIGHT);
      if (pool.height < needed || pool.height < 2 * LANE_MIN_HEIGHT) {
        this.resizeTo(pool, {
          x: pool.x,
          y: pool.y,
          width: pool.width,
          height: Math.max(needed, 2 * LANE_MIN_HEIGHT),
        });
      }
      const h2 = pool.height - h1;
      const first = this.newLane({ x: inner.x, y: pool.y, width: inner.width, height: h1 }, pool);
      Object.assign(shape, { width: inner.width, height: h2 });
      ctx.position = centerOf({ x: inner.x, y: pool.y + h1, width: inner.width, height: h2 });
      ctx.laneContent = content.filter((c: any) => c !== first);
      ctx.firstLane = first;
      return;
    }

    const anchor = hints.laneAnchor || (isLane(target) ? target : lanes[lanes.length - 1]);
    const location = hints.laneLocation || 'bottom';
    const h = Math.max(LANE_MIN_HEIGHT, DEFAULT_LANE_HEIGHT);
    const y0 = location === 'top' ? anchor.y : anchor.y + anchor.height;
    const pushFrom = location === 'top' ? anchor.y : anchor.y + anchor.height;
    const push = lanes.filter((l) => l.y >= pushFrom - 0.5);
    if (push.length) this.modeling.moveElements(push, { x: 0, y: h }, undefined, { autoResize: false });
    this.resizeTo(pool, { x: pool.x, y: pool.y, width: pool.width, height: pool.height + h });
    Object.assign(shape, { width: inner.width, height: h });
    ctx.position = centerOf({ x: inner.x, y: y0, width: inner.width, height: h });
  }

  private assignToLanes(content: any[], pool: any) {
    const lanes = lanesOf(pool);
    for (const el of content) {
      if (!el.parent || el.type === 'workflow:boundaryEvent') continue;
      const cy = el.y + el.height / 2;
      const lane = lanes.find((l) => cy >= l.y && cy < l.y + l.height) || lanes[lanes.length - 1];
      if (!lane) continue;
      let dy = 0;
      if (el.y < lane.y + 4) dy = lane.y + 4 - el.y;
      else if (el.y + el.height > lane.y + lane.height - 4)
        dy = lane.y + lane.height - 4 - (el.y + el.height);
      if (el.height > lane.height - 8) dy = 0;
      if (el.parent !== lane || dy)
        this.modeling.moveElements([el], { x: 0, y: dy }, lane, { autoResize: false });
    }
  }

  dividePool(pool: any, count: number) {
    const inner = innerBounds(pool);
    const content = directContent(pool);
    const first = this.newLane({ x: inner.x, y: pool.y, width: inner.width, height: pool.height }, pool);
    if (content.length) this.modeling.moveElements(content, { x: 0, y: 0 }, first, { autoResize: false });
    this.splitLane(first, count);
  }

  splitLane(lane: any, count: number) {
    const pool = lane.parent;
    const part = Math.floor(lane.height / count);
    const content = directContent(lane);
    const bottom = lane.y + lane.height;
    this.resizeTo(lane, { x: lane.x, y: lane.y, width: lane.width, height: part });
    for (let i = 1; i < count; i++) {
      const y = lane.y + part * i;
      const h = i === count - 1 ? bottom - y : part;
      this.newLane({ x: lane.x, y, width: lane.width, height: h }, pool);
    }
    this.assignToLanes(content, pool);
  }

  private closeLaneGap(deleted: any, pool: any) {
    const lanes = lanesOf(pool);
    if (!lanes.length) return;
    const top = deleted.y,
      bottom = deleted.y + deleted.height;
    const above = lanes.find((l) => Math.abs(l.y + l.height - top) < 1);
    const below = lanes.find((l) => Math.abs(l.y - bottom) < 1);
    if (above)
      this.resizeTo(above, {
        x: above.x,
        y: above.y,
        width: above.width,
        height: above.height + deleted.height,
      });
    else if (below)
      this.resizeTo(below, { x: below.x, y: top, width: below.width, height: below.height + deleted.height });
  }

  private flushReparented() {
    const shapes = [...this.reparented];
    this.reparented.clear();
    for (const shape of shapes) if (this.elementRegistry.get(shape.id)) this.fixCrossingFlows(shape);
  }

  private fixCrossingFlows(shape: any) {
    const flows = [...(shape.incoming || []), ...(shape.outgoing || [])];
    for (const flow of new Set<any>(flows)) {
      if (flow.type !== 'workflow:sequenceFlow' && flow.type !== 'workflow:messageFlow') continue;
      if (!this.elementRegistry.get(flow.id)) continue;
      const { source, target } = flow;
      const allowed = this.rules.allowed('connection.create', { source, target });
      const wanted = allowed && typeof allowed === 'object' ? allowed.type : allowed ? flow.type : null;
      if (wanted === flow.type) continue;
      const name = flow.businessObject?.name;
      this.modeling.removeConnection(flow);
      if (wanted === 'workflow:messageFlow' || wanted === 'workflow:sequenceFlow') {
        const c = this.modeling.connect(source, target, { type: wanted });
        if (name && c?.businessObject) this.modeling.updateProperties(c, { name });
      }
    }
  }
}
