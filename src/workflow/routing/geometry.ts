export interface Point { x: number; y: number; original?: Point }
export interface Rect { x: number; y: number; width: number; height: number }

export function polylineLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return len;
}

export function getConnectionLabelPosition(points: Point[]): { x: number; y: number; horizontal: boolean } {
  if (!points || points.length < 2) return { x: points?.[0]?.x ?? 0, y: points?.[0]?.y ?? 0, horizontal: true };
  const half = polylineLength(points) / 2;
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + seg >= half) {
      const t = seg === 0 ? 0 : (half - acc) / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, horizontal: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) };
    }
    acc += seg;
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y, horizontal: true };
}

export function segmentIntersectsRect(a: Point, b: Point, r: Rect): boolean {
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
  return maxX > r.x && minX < r.x + r.width && maxY > r.y && minY < r.y + r.height;
}

export function inflate(r: Rect, m: number): Rect {
  return { x: r.x - m, y: r.y - m, width: r.width + 2 * m, height: r.height + 2 * m };
}

export function simplify(points: Point[]): Point[] {
  const dedup: Point[] = [];
  for (const p of points) {
    const prev = dedup[dedup.length - 1];
    if (!prev || prev.x !== p.x || prev.y !== p.y) dedup.push(p);
  }
  if (dedup.length < 3) return dedup;
  const out: Point[] = [dedup[0]];
  for (let i = 1; i < dedup.length - 1; i++) {
    const a = out[out.length - 1], b = dedup[i], c = dedup[i + 1];
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (!collinear) out.push(b);
  }
  out.push(dedup[dedup.length - 1]);
  return out;
}
