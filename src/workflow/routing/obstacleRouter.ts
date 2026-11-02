import { Point, Rect, inflate, segmentIntersectsRect, simplify } from './geometry';

const MARGIN = 14;
const BEND_PENALTY = 250;

export function pathCollides(points: Point[], obstacles: Rect[], clearance = 2): boolean {
  const rects = obstacles.map((o) => inflate(o, clearance));
  for (let i = 1; i < points.length; i++) {
    for (const r of rects) if (segmentIntersectsRect(points[i - 1], points[i], r)) return true;
  }
  return false;
}

interface Node { x: number; y: number; xi: number; yi: number }

export function pathInside(points: Point[], bounds?: Rect | null): boolean {
  if (!bounds) return true;
  return points.every((p) => p.x >= bounds.x && p.x <= bounds.x + bounds.width && p.y >= bounds.y && p.y <= bounds.y + bounds.height);
}

export function routeAround(start: Point, end: Point, source: Rect, target: Rect, obstacles: Rect[], bounds?: Rect | null): Point[] | null {
  const solid = obstacles.map((o) => inflate(o, MARGIN - 2));
  const srcR = inflate(source, 0), tgtR = inflate(target, 0);

  const xs = new Set<number>([start.x, end.x, Math.round((start.x + end.x) / 2)]);
  const ys = new Set<number>([start.y, end.y, Math.round((start.y + end.y) / 2)]);
  for (const r of [...obstacles, source, target]) {
    xs.add(r.x - MARGIN); xs.add(r.x + r.width + MARGIN);
    ys.add(r.y - MARGIN); ys.add(r.y + r.height + MARGIN);
  }
  const X = [...xs].sort((a, b) => a - b), Y = [...ys].sort((a, b) => a - b);

  const within = (r: Rect, x: number, y: number) => x > r.x && x < r.x + r.width && y > r.y && y < r.y + r.height;
  const insideAny = (x: number, y: number) =>
    solid.some((r) => within(r, x, y)) ||
    (within(inflate(source, -1), x, y) && x !== start.x && y !== start.y) ||
    (within(inflate(target, -1), x, y) && x !== end.x && y !== end.y);

  const startNode: Node = { x: start.x, y: start.y, xi: X.indexOf(start.x), yi: Y.indexOf(start.y) };
  const endNode: Node = { x: end.x, y: end.y, xi: X.indexOf(end.x), yi: Y.indexOf(end.y) };

  const valid = (xi: number, yi: number) =>
    (bounds ? pathInside([{ x: X[xi], y: Y[yi] }], bounds) : true) &&
    ((xi === startNode.xi && yi === startNode.yi) || (xi === endNode.xi && yi === endNode.yi) || !insideAny(X[xi], Y[yi]));

  const edgeFree = (a: Node, b: Node) => {
    const pa = { x: a.x, y: a.y }, pb = { x: b.x, y: b.y };
    for (const r of solid) if (segmentIntersectsRect(pa, pb, r)) return false;
    const touchesStart = (a.xi === startNode.xi && a.yi === startNode.yi) || (b.xi === startNode.xi && b.yi === startNode.yi);
    const touchesEnd = (a.xi === endNode.xi && a.yi === endNode.yi) || (b.xi === endNode.xi && b.yi === endNode.yi);
    const onStartLine = (a.x === start.x && b.x === start.x) || (a.y === start.y && b.y === start.y);
    const onEndLine = (a.x === end.x && b.x === end.x) || (a.y === end.y && b.y === end.y);
    if (!touchesStart && !onStartLine && segmentIntersectsRect(pa, pb, srcR)) return false;
    if (!touchesEnd && !onEndLine && segmentIntersectsRect(pa, pb, tgtR)) return false;
    return true;
  };

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (xi: number, yi: number, d: number) => `${xi},${yi},${d}`;
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const open: Array<{ k: string; xi: number; yi: number; d: number; c: number }> = [];

  const push = (xi: number, yi: number, d: number, c: number, from?: string) => {
    const k = key(xi, yi, d);
    if (c < (dist.get(k) ?? Infinity)) {
      dist.set(k, c);
      if (from) prev.set(k, from);
      open.push({ k, xi, yi, d, c });
    }
  };
  push(startNode.xi, startNode.yi, -1, 0);

  let best: string | null = null;
  while (open.length) {
    open.sort((a, b) => a.c - b.c);
    const cur = open.shift()!;
    if (cur.c > (dist.get(cur.k) ?? Infinity)) continue;
    if (cur.xi === endNode.xi && cur.yi === endNode.yi) { best = cur.k; break; }
    DIRS.forEach(([dx, dy], d) => {
      let nx = cur.xi + dx, ny = cur.yi + dy;
      if (nx < 0 || ny < 0 || nx >= X.length || ny >= Y.length) return;
      if (!valid(nx, ny)) return;
      const a: Node = { x: X[cur.xi], y: Y[cur.yi], xi: cur.xi, yi: cur.yi };
      const b: Node = { x: X[nx], y: Y[ny], xi: nx, yi: ny };
      if (!edgeFree(a, b)) return;
      const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      const bend = cur.d !== -1 && cur.d !== d ? BEND_PENALTY : 0;
      push(nx, ny, d, cur.c + len + bend, cur.k);
    });
  }
  if (!best) return null;

  const pts: Point[] = [];
  let k: string | undefined = best;
  while (k) {
    const [xi, yi] = k.split(',').map(Number);
    pts.push({ x: X[xi], y: Y[yi] });
    k = prev.get(k);
  }
  pts.reverse();
  return simplify(pts);
}
