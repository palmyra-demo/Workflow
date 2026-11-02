import BaseElementFactory from 'diagram-js/lib/core/ElementFactory';

import {
  WorkflowType,
  WorkflowBusinessObject,
  isConnectionType,
  nextId,
} from './types';
import { defaultSize } from './elementTemplates';

export default class CustomElementFactory extends (BaseElementFactory as any) {
  constructor() {
    super();
  }

  private buildBusinessObject(
    type: WorkflowType,
    attrs: Partial<WorkflowBusinessObject> = {},
  ): WorkflowBusinessObject {
    return {
      id: attrs.id || nextId(type),
      type,
      name: attrs.name,
      documentation: attrs.documentation,
      taskType: attrs.taskType,
      assignee: attrs.assignee,
      eventType: attrs.eventType,
      eventDefinition: attrs.eventDefinition,
      gatewayType: attrs.gatewayType,
      customProperties: attrs.customProperties || {},
      palmyra: attrs.palmyra || {},
      bpmnType: attrs.bpmnType,
    };
  }

  createWorkflowShape(
    type: WorkflowType,
    attrs: Record<string, any> = {},
  ): any {
    const size = defaultSize(type);
    const businessObject =
      attrs.businessObject || this.buildBusinessObject(type, attrs.businessObject || attrs);

    const shape = (this as any).createShape({
      ...attrs,
      type,
      id: businessObject.id,
      width: attrs.width ?? size.width,
      height: attrs.height ?? size.height,
      businessObject,
    });

    return shape;
  }

  createWorkflowConnection(
    type: WorkflowType,
    attrs: Record<string, any> = {},
  ): any {
    const businessObject =
      attrs.businessObject || this.buildBusinessObject(type, attrs.businessObject || attrs);

    return (this as any).createConnection({
      ...attrs,
      type,
      id: businessObject.id,
      businessObject,
    });
  }

  createWorkflowElement(type: WorkflowType, attrs: Record<string, any> = {}): any {
    return isConnectionType(type)
      ? this.createWorkflowConnection(type, attrs)
      : this.createWorkflowShape(type, attrs);
  }
}
