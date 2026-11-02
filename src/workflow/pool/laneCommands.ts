import { isLane, isPool, lanesOf, LANE_MIN_HEIGHT } from './poolUtils';

/** `lane.add` – insert an empty lane above / below an existing lane (one undo step). */
export class AddLaneHandler {
  static $inject = ['modeling', 'elementFactory'];
  constructor(private modeling: any, private elementFactory: any) {}
  preExecute(ctx: { lane: any; location: 'top' | 'bottom' }) {
    const { lane, location } = ctx;
    if (!isLane(lane) || !isPool(lane.parent)) throw new Error('Lanes can only be added next to an existing lane');
    const shape = this.elementFactory.createWorkflowShape('workflow:lane', { width: lane.width, height: 120 });
    const pool = lane.parent;
    this.modeling.createShape(shape, { x: lane.x + lane.width / 2, y: lane.y + lane.height / 2 }, pool, { laneAnchor: lane, laneLocation: location });
  }
  execute() { return []; }
  revert() { return []; }
}

/** `lane.split` – divide a lane into `count` equally high lanes. */
export class SplitLaneHandler {
  static $inject = ['poolBehavior'];
  constructor(private poolBehavior: any) {}
  preExecute(ctx: { lane: any; count: number }) {
    const target = ctx.lane;
    if (!(isLane(target) || isPool(target)) || target.height < ctx.count * LANE_MIN_HEIGHT) throw new Error('Lane is too small to be divided');
    if (isPool(target)) {
      if (lanesOf(target).length) throw new Error('Pool is already divided into lanes');
      this.poolBehavior.dividePool(target, ctx.count);
    } else this.poolBehavior.splitLane(target, ctx.count);
  }
  execute() { return []; }
  revert() { return []; }
}
