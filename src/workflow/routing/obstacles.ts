import { categoryOf, isConnectionType, isWorkflowElement, WorkflowType } from '../types';
import { isAncestorOf } from '../pool/poolUtils';
import { Rect } from './geometry';

export function getObstacles(elementRegistry: any, source: any, target: any): Rect[] {
  const result: Rect[] = [];
  elementRegistry.forEach((el: any) => {
    if (!el || el.waypoints || el.labelTarget || el.hidden || !isWorkflowElement(el)) return;
    if (isConnectionType(el.type)) return;
    if (el === source || el === target) return;
    if (el.width == null || el.height == null) return;
    const cat = categoryOf(el.type as WorkflowType);
    if (cat === 'container' || el.type === 'workflow:group') return;
    if (isAncestorOf(el, source) || isAncestorOf(el, target)) return;
    if (isAncestorOf(source, el) || isAncestorOf(target, el)) return;
    if (el.host === source || el.host === target) return;
    if ((source as any)?.host === el || (target as any)?.host === el) return;
    result.push({ x: el.x, y: el.y, width: el.width, height: el.height });
  });
  return result;
}
