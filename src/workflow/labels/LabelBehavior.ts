import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import {
  connectionLabelAnchor, connectionLabelSize, defaultConnectionLabelBounds, defaultLabelBounds, hasExternalLabel, isLabeledConnection, labelHeight,
} from './labelUtils';

/**
 * External labels (bpmn.io style): a label shape below events / gateways / data elements.
 *  - exists while the element has a name, is created / resized / removed with it
 *  - can be dragged on its own; moves, deletes and re-parents together with its element
 *    (diagram-js LabelSupport takes care of move closure and removal)
 *  - removing the label shape clears the name, like in bpmn.io
 */
export default class LabelBehavior extends (CommandInterceptor as any) {
  static $inject = ['eventBus', 'modeling', 'elementRegistry'];

  constructor(eventBus: any, private modeling: any, private elementRegistry: any) {
    super(eventBus);

    this.postExecuted('shape.create', (e: any) => this.sync(e.context.shape));

    this.postExecuted('connection.create', (e: any) => this.sync(e.context.connection));

    // the label keeps its offset to the path: shift it by however far the middle of the path moved
    this.postExecuted(['connection.layout', 'connection.updateWaypoints'], (e: any) => {
      const { connection, oldWaypoints, hints } = e.context;
      const label = connection && (connection.labels || [])[0];
      if (!label || !oldWaypoints || !connection.waypoints || hints?.labelBehavior === false) return;
      if (!this.elementRegistry.get(connection.id)) return;
      const before = connectionLabelAnchor(oldWaypoints), after = connectionLabelAnchor(connection.waypoints);
      const dx = Math.round(after.x - before.x), dy = Math.round(after.y - before.y);
      if (dx || dy) this.modeling.moveShape(label, { x: dx, y: dy }, label.parent, { autoResize: false });
    });

    this.postExecuted('element.updateProperties', (e: any) => {
      const { element, properties } = e.context;
      if (element && properties && 'name' in properties) this.sync(element);
    });

    this.postExecuted('shape.delete', (e: any) => {
      const c = e.context;
      if (c.hints?.nested || !c.labelTarget) return;
      const target = c.labelTarget;
      if (this.elementRegistry.get(target.id) && target.businessObject?.name) {
        this.modeling.updateProperties(target, { name: '' });
      }
    });
  }

  private sync(element: any) {
    if (!hasExternalLabel(element) || !this.elementRegistry.get(element.id)) return;
    const name = String(element.businessObject?.name || '').trim();
    const label = (element.labels || [])[0];

    if (!name) {
      if (label) this.modeling.removeShape(label, { nested: true });
      return;
    }

    const connection = isLabeledConnection(element);

    if (!label) {
      const b = connection ? defaultConnectionLabelBounds(element, name) : defaultLabelBounds(element, name);
      this.modeling.createLabel(
        element,
        { x: b.x + b.width / 2, y: b.y + b.height / 2 },
        { id: `${element.id}_label`, width: b.width, height: b.height, businessObject: element.businessObject },
        element.parent,
      );
      return;
    }

    // connection labels re-fit their text around the centre, shape labels keep width and top edge
    const size = connection ? connectionLabelSize(name) : { width: label.width, height: labelHeight(name, label.width) };
    if (label.height !== size.height || label.width !== size.width) {
      const cx = label.x + label.width / 2, cy = label.y + label.height / 2;
      const next = connection
        ? { x: Math.round(cx - size.width / 2), y: Math.round(cy - size.height / 2), width: size.width, height: size.height }
        : { x: label.x, y: label.y, width: size.width, height: size.height };
      this.modeling.resizeShape(label, next, null, { autoResize: false });
    }
  }
}
