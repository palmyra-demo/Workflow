import BaseModeling from 'diagram-js/lib/features/modeling/Modeling';
import { isModelElement } from 'diagram-js/lib/model';

import UpdatePropertiesHandler from './cmd/UpdatePropertiesHandler';
import ToggleCollapseHandler from './subprocess/ToggleCollapseHandler';
import { WorkflowBusinessObject, isWorkflowType } from './types';
import { AddLaneHandler, SplitLaneHandler } from './pool/laneCommands';
import { isPool, isSubProcessLike } from './pool/poolUtils';

export default class CustomModeling extends (BaseModeling as any) {
  static $inject = ['eventBus', 'elementFactory', 'commandStack', 'canvas'];
  private _canvas: any;

  constructor(eventBus: any, elementFactory: any, commandStack: any, canvas: any) {
    super(eventBus, elementFactory, commandStack);
    this._canvas = canvas;
  }

  getHandlers(): Record<string, any> {
    const handlers = super.getHandlers();
    handlers['element.updateProperties'] = UpdatePropertiesHandler;
    handlers['lane.add'] = AddLaneHandler;
    handlers['lane.split'] = SplitLaneHandler;
    handlers['workflow.toggleCollapse'] = ToggleCollapseHandler;
    return handlers;
  }

  updateProperties(element: any, properties: Partial<WorkflowBusinessObject>): void {
    this._commandStack.execute('element.updateProperties', {
      element,
      properties,
    });
  }

  toggleSubProcess(shape: any): void {
    this._commandStack.execute('workflow.toggleCollapse', { shape });
  }

  addLane(lane: any, location: 'top' | 'bottom'): void {
    this._commandStack.execute('lane.add', { lane, location });
  }

  splitLane(lane: any, count: number): void {
    this._commandStack.execute('lane.split', { lane, count });
  }

  connect(source: any, target: any, attrs?: any, hints?: any): any {
    let parent: any = this._canvas.getRootElement();
    if (attrs?.type !== 'workflow:messageFlow') {
      const chain = new Set<any>();
      for (let c = source?.parent; c; c = c.parent) chain.add(c);
      for (let c = target?.parent; c; c = c.parent) {
        if (chain.has(c) && (isPool(c) || isSubProcessLike(c))) {
          parent = c;
          break;
        }
      }
    }
    return this.createConnection(source, target, attrs || {}, parent, hints);
  }

  _create(type: string, attrs: any): any {
    if (attrs && typeof attrs === 'object' && !isModelElement(attrs)) {
      if (type === 'connection' && !attrs.businessObject) {
        const wfType = isWorkflowType(attrs.type) ? attrs.type : 'workflow:sequenceFlow';
        return (this._elementFactory as any).createWorkflowConnection(wfType, attrs);
      }
      if (isWorkflowType(attrs.type) && !attrs.businessObject) {
        return (this._elementFactory as any).createWorkflowElement(attrs.type, attrs);
      }

      if (attrs.businessObject && attrs.businessObject.id && !attrs.id) {
        attrs.id = attrs.businessObject.id;
      }
    }
    return super._create(type, attrs);
  }
}
