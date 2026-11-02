// CustomConnectionDocking.ts
import { getIntersections } from 'diagram-js/lib/layout/LayoutUtil';

export default class CustomConnectionDocking {
  static $inject = ['canvas'];


  getCroppedWaypoints(connection: any, source?: any, target?: any): any[] {
    const waypoints = connection.waypoints;
    if (waypoints.length < 2) return waypoints;

    let cropped = [...waypoints];
    const src = source || connection.source;
    const tgt = target || connection.target;

    // 1. Crop the connection starting point (Source Shape Border)
    if (src) {
      const intersection = this.getIntersectionPoint(waypoints, src);
      if (intersection) {
        cropped[0] = intersection;
      }
    }

    // 2. Crop the connection ending point (Target Shape Border)
    if (tgt) {
      const lastIdx = waypoints.length - 1;
      const reverseWaypoints = [...waypoints].reverse();
      const intersection = this.getIntersectionPoint(reverseWaypoints, tgt);
      if (intersection) {
        cropped[lastIdx] = intersection;
      }
    }

    return cropped;
  }

  /**
   * Helper to compute the geometric boundary intersection point
   */
  private getIntersectionPoint(waypoints: any[], shape: any) {
    // If it's a circular event shape (Start, End, Rejected, Done)
    if (shape.type && (shape.type.includes('Event') || shape.type.includes('start') || shape.type.includes('end'))) {
      const radius = shape.width / 2;
      const cx = shape.x + radius;
      const cy = shape.y + radius;

      const p1 = waypoints[0];
      const p2 = waypoints[1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);

      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    }

    // Standard bounding box intersection calculation for tasks, gateways, and pools
    return getIntersections(waypoints[0], waypoints[1]);
  }

  getDockingPoint(connection: any, _shape: any, dockStart?: boolean): any {
    const waypoints = connection.waypoints;
    const dockingIdx = dockStart ? 0 : waypoints.length - 1;
    const dockingPoint = waypoints[dockingIdx];

    return {
      point: dockingPoint,
      actual: dockingPoint,
      idx: dockingIdx
    };
  }
}
