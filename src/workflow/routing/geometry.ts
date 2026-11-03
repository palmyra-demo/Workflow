export interface Point {
  x: number;
  y: number;
  original?: Point;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function segmentIntersectsRect(a: Point, b: Point, r: Rect): boolean {
  const minX = Math.min(a.x, b.x),
    maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y),
    maxY = Math.max(a.y, b.y);
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
    const a = out[out.length - 1],
      b = dedup[i],
      c = dedup[i + 1];
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (!collinear) out.push(b);
  }
  out.push(dedup[dedup.length - 1]);
  return out;
}
