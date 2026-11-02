import { categoryOf, isConnectionType, isWorkflowElement, WorkflowType } from '../types';
import { Rect } from './geometry';

function isAncestor(candidate: any, element: any): boolean {
  for (let p = element?.parent; p; p = p.parent) if (p === candidate) return true;
  return false;
}

export function getObstacles(elementRegistry: any, source: any, target: any): Rect[] {
  const result: Rect[] = [];
  elementRegistry.forEach((el: any) => {
    if (!el || el.waypoints || el.labelTarget || el.hidden || !isWorkflowElement(el)) return;
    if (isConnectionType(el.type)) return;
    if (el === source || el === target) return;
    if (el.width == null || el.height == null) return;
    const cat = categoryOf(el.type as WorkflowType);
    if (cat === 'container' || el.type === 'workflow:group') return;
    if (isAncestor(el, source) || isAncestor(el, target)) return;
    if (isAncestor(source, el) || isAncestor(target, el)) return;
    if (el.host === source || el.host === target) return;
    if ((source as any)?.host === el || (target as any)?.host === el) return;
    result.push({ x: el.x, y: el.y, width: el.width, height: el.height });
  });
  return result;
}
