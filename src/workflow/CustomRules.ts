import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import { WorkflowType, categoryOf, isWorkflowElement } from './types';
import {
  isPool, isLane, isSubProcessLike, isCollapsedSub, isRoot, isAncestorOf, hasPools, lanesOf, poolOf, processContainerOf,
  POOL_HEADER, POOL_MIN_INNER_WIDTH, POOL_MIN_HEIGHT, LANE_MIN_HEIGHT,
} from './pool/poolUtils';

export default class CustomRules extends (RuleProvider as any) {
  static $inject = ['eventBus', 'elementRegistry', 'injector'];
  lastReason: string | null = null;

  constructor(eventBus: any, private elementRegistry: any, private injector: any) { super(eventBus); }

  /** the collapsed sub-process that is currently open (its content is shown instead of the process) */
  private drilled(): any { return this.injector.get('subProcessView', false)?.getDrilled() ?? null; }

  /** while a sub-process is open, dropping on the empty canvas means dropping into it */
  private effectiveTarget(target: any): any { const d = this.drilled(); return d && isRoot(target) ? d : target; }

  init(): void {
    this.addRule('shape.create', (c: any) => this.canCreate(c.shape, c.target));
    this.addRule('elements.create', (c: any) => (c.elements || []).every((e: any) => !e.waypoints ? this.canCreate(e, c.target) : true));
    this.addRule('elements.move', (c: any) => this.canMove(c.shapes, c.target));
    this.addRule('connection.create', (c: any) => this.canConnect(c.source, c.target));
    this.addRule('connection.reconnect', (c: any) => this.canReconnect(c.connection, c.source, c.target));
    this.addRule('shape.resize', (c: any) => this.canResize(c.shape, c.newBounds));
    this.addRule('element.autoResize', (c: any) => this.canAutoResize(c.elements || [], c.target));
    this.addRule(['elements.delete', 'shape.delete', 'connection.delete'], () => true);
  }

  private deny(reason: string): false { this.lastReason = reason; return false; }

  containmentProblem(shape: any, target: any): string | null {
    const type = shape.type as WorkflowType;
    const cat = categoryOf(type);

    if (isPool(shape)) {
      return isRoot(target) ? null : 'A Pool can only be placed on the empty canvas – Pools cannot be nested.';
    }
    if (isLane(shape)) {
      return isPool(target) || isLane(target) ? null : 'A Lane can only be placed inside a Pool.';
    }
    if (type === 'workflow:boundaryEvent') {
      return this.isAttachable(target) ? null : 'A boundary event must be attached to a task or sub-process.';
    }
    if (isCollapsedSub(target) && target !== this.drilled()) {
      return 'This sub-process is collapsed – open it (↗) or expand it to add elements.';
    }
    if (cat === 'artifact') {
      return isRoot(target) || isPool(target) || isLane(target) || isSubProcessLike(target)
        ? null : 'Annotations and groups can only be placed on the canvas, a Pool, a Lane or a Sub-process.';
    }
    // flow nodes + data
    if (isRoot(target)) {
      if (type === 'workflow:dataStore' || !hasPools(this.elementRegistry)) return null;
      return 'Elements must be placed inside a Pool or Lane when the diagram contains Pools.';
    }
    if (isPool(target)) {
      return lanesOf(target).length ? 'This Pool is divided into Lanes – drop the element into one of its Lanes.' : null;
    }
    if (isLane(target) || isSubProcessLike(target)) return null;
    return 'Elements can only be placed inside a Pool, Lane or Sub-process.';
  }

  canCreate(shape: any, target: any): boolean {
    target = this.effectiveTarget(target);
    if (!isWorkflowElement(shape)) return this.deny('Unknown element type.');
    const problem = this.containmentProblem(shape, target);
    return problem ? this.deny(problem) : true;
  }

  canMove(shapes: any[], target: any): boolean {
    target = this.effectiveTarget(target);
    shapes = shapes.filter((s) => !s.labelTarget);
    if (!shapes.length) return true;
    if (!shapes.every(isWorkflowElement)) return this.deny('Only workflow elements can be moved.');
    if (target?.type === 'workflow:boundaryEvent') return this.deny('Elements cannot be dropped onto a boundary event.');
    for (const shape of shapes) {
      if (isLane(shape)) return this.deny('A Lane cannot be moved on its own – move its Pool instead.');
      const overSelf = !!target && (target === shape || isAncestorOf(shape, target) || shapes.some((s) => s !== shape && (target === s || isAncestorOf(s, target))));
      if (!target) continue;
      const effective = overSelf ? shape.parent : target;
      if (overSelf && isRoot(effective)) continue;
      const problem = this.containmentProblem(shape, effective);
      if (problem) return this.deny(problem);
    }
    return true;
  }


  canResize(shape: any, newBounds?: any): boolean {
    const category = categoryOf(shape.type as WorkflowType);
    if (category !== 'task' && category !== 'container') return false;
    if (newBounds) {
      if (isPool(shape) && (newBounds.width < POOL_HEADER + POOL_MIN_INNER_WIDTH || newBounds.height < POOL_MIN_HEIGHT)) {
        return this.deny('The Pool cannot be made smaller.');
      }
      if (isLane(shape) && newBounds.height < LANE_MIN_HEIGHT) return this.deny('The Lane cannot be made smaller.');
    }
    return true;
  }

  canAutoResize(elements: any[], target: any): boolean {
    if (isRoot(target) || isCollapsedSub(target)) return false; // a collapsed sub-process keeps its small size
    if (isPool(target)) return !elements.some(isLane) && lanesOf(target).length === 0;
    return isLane(target) || isSubProcessLike(target);
  }

  canReconnect(connection: any, source: any, target: any): boolean {
    const result = this.canConnect(source, target);
    if (!result) return false;
    const next = typeof result === 'object' ? result.type : connection.type;
    const assoc = (t: string) => t === 'workflow:association' || t === 'workflow:dataAssociation';
    if (next === connection.type || (assoc(next) && assoc(connection.type))) return true;
    return this.deny(`This connection cannot be re-attached here – it would have to become a ${next.replace('workflow:', '')}.`);
  }

  canConnect(source: any, target: any): { type: WorkflowType } | boolean {
    if (!source || !target || source === target || !isWorkflowElement(source) || !isWorkflowElement(target)) return false;
    const sType = source.type as WorkflowType, tType = target.type as WorkflowType;
    const sCat = categoryOf(sType), tCat = categoryOf(tType);

    if (isLane(source) || isLane(target)) return this.deny('Lanes cannot be connected – connect the elements inside them.');
    if (sCat === 'data' || tCat === 'data' || sCat === 'artifact' || tCat === 'artifact') return { type: 'workflow:association' };

    const sPool = poolOf(source), tPool = poolOf(target);

    if (sPool && tPool && sPool !== tPool) {
      if (sCat === 'gateway' || tCat === 'gateway') return this.deny('Message flows cannot start or end at a gateway.');
      if (sType.endsWith('tartEvent')) return this.deny('A start event cannot send a message.');
      if (tType.endsWith('ndEvent')) return this.deny('An end event cannot receive a message.');
      if (sType === 'workflow:boundaryEvent' || tType === 'workflow:boundaryEvent') return this.deny('Message flows cannot be attached to boundary events.');
      return { type: 'workflow:messageFlow' };
    }

    if (sType.endsWith('ndEvent')) return this.deny('An end event cannot have outgoing flows.');
    if (tType.endsWith('tartEvent')) return this.deny('A start event cannot have incoming flows.');
    if (sType === 'workflow:boundaryEvent' && tCat === 'event') return false;
    if (tType === 'workflow:boundaryEvent') return false;
    if (sCat === 'container' || tCat === 'container') {
      return this.deny('Sequence flows connect elements inside a Pool – use a Message Flow to connect Pools.');
    }
    if (sPool !== tPool) return this.deny('Sequence flows cannot cross Pool boundaries – use a Message Flow between different Pools.');
    if (processContainerOf(source) !== processContainerOf(target)) {
      return this.deny('Sequence flows cannot cross Sub-process boundaries.');
    }
    return { type: 'workflow:sequenceFlow' };
  }

  private isAttachable(element: any): boolean {
    return !!element && isWorkflowElement(element) && categoryOf(element.type as WorkflowType) === 'task' && element.type !== 'workflow:boundaryEvent';
  }
}
