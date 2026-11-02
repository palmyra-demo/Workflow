import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import { Point, Rect } from './geometry';

function inside(p: Point, r: Rect): boolean {
  return p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height;
}

/** Pull an end point that is still inside its shape back onto the shape's bounds. */
function pushOut(point: Point, neighbour: Point, shape: Rect): Point {
  if (!inside(point, shape)) return point;
  const out: Point = { x: point.x, y: point.y, original: point.original };
  if (neighbour.x === point.x) out.y = neighbour.y < shape.y + shape.height / 2 ? shape.y : shape.y + shape.height;
  else if (neighbour.y === point.y) out.x = neighbour.x < shape.x + shape.width / 2 ? shape.x : shape.x + shape.width;
  return out;
}

/**
 * - crops laid out connections to the outline of source / target (docking), like bpmn-js' BpmnUpdater
 * - keeps track of connections whose bendpoints were edited by hand, so auto layout leaves them alone
 */
export default class ConnectionRoutingBehavior extends (CommandInterceptor as any) {
  static $inject = ['eventBus', 'connectionDocking'];

  constructor(eventBus: any, private connectionDocking: any) {
    super(eventBus);

    const crop = (e: any) => {
      const context = e.context;
      if (context.cropped) return;
      const connection = context.connection;
      if (!connection.waypoints || connection.waypoints.length < 2) return;
      connection.waypoints = this.crop(connection);
      context.cropped = true;
    };

    // imported / supplied waypoints are already docked – do not touch them
    this.preExecute('connection.create', (e: any) => {
      const c = e.context.connection;
      if (c.waypoints && c.waypoints.length >= 2) {
        e.context.cropped = true;
        c.manualRouting = c.waypoints.length > 2;
      }
    });

    this.executed(['connection.layout', 'connection.create'], crop);
    this.reverted('connection.layout', (e: any) => { delete e.context.cropped; });

    // manual edits via bendpoints / segment dragging
    this.executed('connection.updateWaypoints', (e: any) => {
      const { connection, newWaypoints } = e.context;
      e.context.oldManualRouting = connection.manualRouting;
      connection.manualRouting = newWaypoints.length > 2;
    });
    this.reverted('connection.updateWaypoints', (e: any) => {
      e.context.connection.manualRouting = e.context.oldManualRouting;
    });

    // reconnecting starts from a fresh, automatic layout
    this.executed('connection.reconnect', (e: any) => {
      const c = e.context.connection;
      e.context.oldManualRouting = c.manualRouting;
      c.manualRouting = false;
    });
    this.reverted('connection.reconnect', (e: any) => {
      e.context.connection.manualRouting = e.context.oldManualRouting;
    });
  }

  private crop(connection: any): Point[] {
    const wps: Point[] = connection.waypoints;
    const last = wps.length - 1;
    const probe = {
      type: connection.type,
      source: connection.source,
      target: connection.target,
      waypoints: wps.map((p, i) => (i === 0 || i === last ? (p.original || p) : p)),
    };
    const cropped: Point[] = this.connectionDocking.getCroppedWaypoints(probe);
    if (cropped.length < 2) return cropped;
    // guarantee arrow ends never lie inside the shapes
    cropped[0] = pushOut(cropped[0], cropped[1], connection.source);
    cropped[cropped.length - 1] = pushOut(cropped[cropped.length - 1], cropped[cropped.length - 2], connection.target);
    return cropped;
  }
}
