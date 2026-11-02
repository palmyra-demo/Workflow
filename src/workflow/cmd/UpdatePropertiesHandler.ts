import { WorkflowBusinessObject } from '../types';

export default class UpdatePropertiesHandler {
  static $inject = ['eventBus'];

  private _eventBus: any;

  constructor(eventBus: any) {
    this._eventBus = eventBus;
  }

  execute(context: {
    element: any;
    properties: Partial<WorkflowBusinessObject>;
    oldProperties?: Partial<WorkflowBusinessObject>;
  }): any[] {
    const { element, properties } = context;
    const bo = element.businessObject as WorkflowBusinessObject;

    const old: Record<string, unknown> = {};
    for (const key of Object.keys(properties)) {
      old[key] = (bo as any)[key];
      (bo as any)[key] = (properties as any)[key];
    }
    context.oldProperties = old;

    this._eventBus.fire('element.propertiesChanged', { element });

    return [element, ...(element.labels || [])];
  }

  revert(context: { element: any; oldProperties?: Record<string, unknown> }): any[] {
    const { element, oldProperties } = context;
    const bo = element.businessObject as WorkflowBusinessObject;

    if (oldProperties) {
      for (const key of Object.keys(oldProperties)) {
        (bo as any)[key] = oldProperties[key];
      }
    }

    this._eventBus.fire('element.propertiesChanged', { element });

    return [element, ...(element.labels || [])];
  }
}
