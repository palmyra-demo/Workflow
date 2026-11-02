import BaseLayouter from 'diagram-js/lib/layout/BaseLayouter';
import { getMid, getOrientation } from 'diagram-js/lib/layout/LayoutUtil';
import {
  connectRectangles,
  repairConnection,
  withoutRedundantPoints,
} from 'diagram-js/lib/layout/ManhattanLayout';

import { categoryOf, WorkflowType } from '../types';
import { Point, simplify } from './geometry';
import { getObstacles } from './obstacles';
import { pathCollides, pathInside, routeAround } from './obstacleRouter';
import { innerBounds, isPool, isSubProcessLike, processContainerOf } from '../pool/poolUtils';

const STRAIGHT_INSET = 10;     
const STRAIGHT_TOLERANCE = 8;  

function isRectLike(shape: any): boolean {
  const c = categoryOf(shape.type as WorkflowType);
  return c === 'task' || c === 'data' || c === 'artifact' || c === 'container';
}

function acceptedRange(shape: any, axis: 'x' | 'y'): [number, number] {
  const size = axis === 'x' ? shape.width : shape.height;
  const pos = axis === 'x' ? shape.x : shape.y;
  if (isRectLike(shape)) return [pos + STRAIGHT_INSET, pos + size - STRAIGHT_INSET];
  const mid = pos + size / 2;
  return [mid - STRAIGHT_TOLERANCE, mid + STRAIGHT_TOLERANCE];
}

function layoutStraight(source: any, target: any): Point[] | null {
  const orientation = getOrientation(source, target, 0);
  if (!/^(top|bottom|left|right)$/.test(orientation)) return null;

  const horizontal = /left|right/.test(orientation);
  const axis: 'x' | 'y' = horizontal ? 'y' : 'x';
  const sm = getMid(source), tm = getMid(target);

  let c: number | null = null;
  const [tLo, tHi] = acceptedRange(target, axis);
  const [sLo, sHi] = acceptedRange(source, axis);
  if (sm[axis] >= tLo && sm[axis] <= tHi) c = sm[axis];
  else if (tm[axis] >= sLo && tm[axis] <= sHi) c = tm[axis];
  if (c === null) return null;

  const a = horizontal ? { x: sm.x, y: c } : { x: c, y: sm.y };
  const b = horizontal ? { x: tm.x, y: c } : { x: c, y: tm.y };
  return [{ ...a, original: { ...a } }, { ...b, original: { ...b } }];
}

export default class CustomLayouter extends (BaseLayouter as any) {
  static $inject = ['elementRegistry'];

  constructor(private elementRegistry: any) {
    super();
  }

  layoutConnection(connection: any, hints: any = {}): Point[] {
    const source = hints.source || connection.source;
    const target = hints.target || connection.target;
    if (!source || !target) return super.layoutConnection(connection, hints);

    const type = connection.type as WorkflowType;

    // associations are plain straight lines, cropped afterwards
    if (type === 'workflow:association' || type === 'workflow:dataAssociation') {
      const a = getMid(source), b = getMid(target);
      return [{ ...a, original: { ...a } }, { ...b, original: { ...b } }];
    }

    const existing: Point[] | undefined = hints.waypoints || connection.waypoints;

    // Manual routing: keep the user's bendpoints, only repair the moved end.
    if (existing && existing.length > 2 && (hints.waypoints || connection.manualRouting)) {
      const start = hints.connectionStart || existing[0].original || existing[0];
      const end = hints.connectionEnd || existing[existing.length - 1].original || existing[existing.length - 1];
      const repaired = repairConnection(source, target, start, end, existing, {
        connectionStart: !!hints.connectionStart,
        connectionEnd: !!hints.connectionEnd,
      } as any);
      return withoutRedundantPoints(repaired) as Point[];
    }

    return this.autoLayout(source, target, type);
  }

  /** Straight line if possible, minimal manhattan route otherwise, detouring around obstacles. */
  autoLayout(source: any, target: any, connectionType?: string): Point[] {
    const obstacles = getObstacles(this.elementRegistry, source, target);
    const messageFlow = connectionType === 'workflow:messageFlow';
    const bounds = messageFlow ? null : this.routingBounds(source, target);
    const start = getMid(source), end = getMid(target);

    const candidates: Point[][] = [];
    const straight = layoutStraight(source, target);
    if (straight) candidates.push(straight);
    candidates.push(withoutRedundantPoints(connectRectangles(source, target, start, end, messageFlow ? { preferredLayouts: ['v:v'] } : {})) as Point[]);

    for (const c of candidates) {
      const pts = this.uncropped(c);
      if (!pathCollides(pts, obstacles) && pathInside(pts, bounds)) return c;
    }

    const detour = routeAround(start, end, source, target, obstacles, bounds) || (bounds ? routeAround(start, end, source, target, obstacles) : null);
    if (detour && detour.length >= 2) {
      detour[0].original = { ...detour[0] };
      detour[detour.length - 1].original = { ...detour[detour.length - 1] };
      return simplify(detour);
    }
    return candidates[candidates.length - 1];
  }

  /** Sequence flows stay inside their pool (minus header) / sub-process. */
  private routingBounds(source: any, target: any) {
    const container = processContainerOf(source);
    if (!container || container !== processContainerOf(target)) return null;
    const r = isPool(container) ? innerBounds(container) : isSubProcessLike(container) ? container : null;
    if (!r) return null;
    const inset = 8;
    return { x: r.x + inset, y: r.y + inset, width: r.width - 2 * inset, height: r.height - 2 * inset };
  }

  private uncropped(points: Point[]): Point[] {
    return points.map((p, i) => (i === 0 || i === points.length - 1) ? (p.original || p) : p);
  }
}
