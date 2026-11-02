import { WorkflowType, categoryOf, isWorkflowElement } from '../types';

export const POOL_HEADER = 30;        // width of the vertical header band of pools and lanes
export const LANE_MIN_HEIGHT = 60;
export const POOL_MIN_INNER_WIDTH = 220;
export const POOL_MIN_HEIGHT = 60;
export const CHILD_PADDING = 20;

export const isPool = (e: any) => e?.type === 'workflow:pool';
export const isLane = (e: any) => e?.type === 'workflow:lane';
export const SUB_PROCESS_TYPES = ['workflow:subProcess', 'workflow:adHocSubProcess', 'workflow:transaction'];
export const isSubProcessLike = (e: any) => SUB_PROCESS_TYPES.includes(e?.type);
/** collapsed sub-process: children are hidden and the shape is a small box with a + marker */
export const isCollapsedSub = (e: any) => isSubProcessLike(e) && e.businessObject?.isExpanded === false;
export const COLLAPSED_SIZE = { width: 100, height: 80 };
export const EXPANDED_SIZE = { width: 350, height: 200 };
export const isContainer = (e: any) => isPool(e) || isLane(e) || isSubProcessLike(e);
export const isRoot = (e: any) => !e || !isWorkflowElement(e);
export const isShape = (e: any) => e && !e.waypoints && e.width != null && !e.labelTarget;

export function isAncestorOf(ancestor: any, element: any): boolean {
  for (let p = element?.parent; p; p = p.parent) if (p === ancestor) return true;
  return false;
}

/** Closest enclosing pool (an element is its own pool if it is one). */
export function poolOf(element: any): any {
  for (let c = element; c; c = c.parent) if (isPool(c)) return c;
  return null;
}

/** Closest enclosing pool / sub-process, skipping lanes and host tasks. `null` = canvas root. */
export function processContainerOf(element: any): any {
  for (let c = element?.parent; c; c = c.parent) if (isPool(c) || isSubProcessLike(c)) return c;
  return null;
}

export function lanesOf(pool: any): any[] {
  return (pool?.children || []).filter(isLane).sort((a: any, b: any) => a.y - b.y);
}

export function innerBounds(pool: any) {
  return { x: pool.x + POOL_HEADER, y: pool.y, width: pool.width - POOL_HEADER, height: pool.height };
}

/** All shapes below `element` that are not lanes (flow nodes, artifacts, ...). */
export function contentDescendants(element: any): any[] {
  const result: any[] = [];
  const walk = (el: any) => {
    for (const c of el.children || []) {
      if (!isShape(c)) continue;
      if (isLane(c)) { walk(c); continue; }
      result.push(c);
      for (const l of c.labels || []) result.push(l);
      if (!isCollapsedSub(c)) walk(c); // what is inside a collapsed sub-process is not on the canvas
    }
  };
  walk(element);
  return result;
}

/** Direct, non-lane shape children (what has to be re-parented when lanes are introduced). */
export function directContent(element: any): any[] {
  return (element.children || []).filter((c: any) => isShape(c) && !isLane(c));
}

export function bboxOf(shapes: any[]): { top: number; left: number; right: number; bottom: number } | null {
  if (!shapes.length) return null;
  let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
  for (const s of shapes) {
    top = Math.min(top, s.y); left = Math.min(left, s.x);
    right = Math.max(right, s.x + s.width); bottom = Math.max(bottom, s.y + s.height);
  }
  return { top, left, right, bottom };
}

export const hasPools = (registry: any): boolean => registry.filter((e: any) => isPool(e)).length > 0;
export const isFlowCategory = (type: WorkflowType) => ['event', 'task', 'gateway', 'data'].includes(categoryOf(type));
