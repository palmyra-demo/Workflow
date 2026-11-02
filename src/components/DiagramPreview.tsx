import { useEffect, useId, useMemo, useState } from 'react';
import type { GraphNode, WorkflowGraph } from '../workflow/io/graph';

/* ------------------------------------------------------------------ model */

const isSubType = (t: string) => /(subprocess|transaction)$/i.test(t);
const isEvent = (t: string) => /event/i.test(t);
const isGateway = (t: string) => /gateway/i.test(t);
const isOutlineType = (t: string) => /(pool|lane|group)$/i.test(t);
const typeName = (t: string) => t.replace(/^workflow:/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

interface Model {
  byId: Map<string, GraphNode>;
  /** ids of the containers a node sits in, innermost first (a boundary event belongs to its host's container) */
  ancestors: Map<string, string[]>;
  collapsed: Set<string>;
  /** how many elements a collapsed sub-process holds */
  size: Map<string, number>;
}

function buildModel(graph: WorkflowGraph): Model {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const containerOf = (n: GraphNode): string | undefined => {
    const p = n.parent ? byId.get(n.parent) : undefined;
    return n.type === 'workflow:boundaryEvent' && p ? p.parent : n.parent;
  };
  const ancestors = new Map<string, string[]>();
  for (const n of graph.nodes) {
    const chain: string[] = [];
    for (let id = containerOf(n), guard = 0; id && guard < 50; guard++) {
      chain.push(id);
      const p = byId.get(id);
      id = p ? containerOf(p) : undefined;
    }
    ancestors.set(n.id, chain);
  }
  const collapsed = new Set(graph.nodes.filter((n) => isSubType(n.type) && n.properties?.isExpanded === false).map((n) => n.id));
  const size = new Map<string, number>();
  for (const n of graph.nodes) for (const a of ancestors.get(n.id) ?? []) if (collapsed.has(a)) size.set(a, (size.get(a) ?? 0) + 1);
  return { byId, ancestors, collapsed, size };
}

/** What the canvas would show while `drilledId` is open (null = the whole process). */
function levelOf(graph: WorkflowGraph, model: Model, drilledId: string | null) {
  const nodes = graph.nodes.filter((n) => {
    if (n.id === drilledId) return false;
    const chain = model.ancestors.get(n.id) ?? [];
    if (drilledId) {
      const at = chain.indexOf(drilledId);
      return at >= 0 && !chain.slice(0, at).some((id) => model.collapsed.has(id));
    }
    return !chain.some((id) => model.collapsed.has(id));
  });
  // parents first, so pools and sub-processes never paint over their content
  const ordered = nodes.map((n, i) => ({ n, i, d: model.ancestors.get(n.id)?.length ?? 0 })).sort((a, b) => a.d - b.d || a.i - b.i).map((x) => x.n);
  const visible = new Set(ordered.map((n) => n.id));
  const edges = graph.edges.filter((e) => visible.has(e.source) && visible.has(e.target));
  return { nodes: ordered, edges };
}

function wrap(text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= max) cur = next;
    else { if (cur) out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] = `${out[lines - 1].slice(0, Math.max(1, max - 1))}…`; }
  return out.map((l) => (l.length > max + 2 ? `${l.slice(0, max)}…` : l));
}

/* ------------------------------------------------------------------ view */

const iconBtn = 'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-[15px] leading-none text-slate-600 [font-family:inherit] transition hover:bg-slate-200/70 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';
const STROKE = '#64748b';

export default function DiagramPreview({ graph, heightClass = 'h-[min(56vh,560px)] min-h-[300px]' }: { graph: WorkflowGraph | null; heightClass?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [path, setPath] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);

  const model = useMemo(() => (graph ? buildModel(graph) : null), [graph]);

  // a stale path (the graph changed under us) falls back to the deepest sub-process that still exists
  const validPath = useMemo(() => {
    if (!model) return [];
    const out: string[] = [];
    for (const id of path) { if (!model.collapsed.has(id)) break; out.push(id); }
    return out;
  }, [path, model]);
  const drilledId = validPath.length ? validPath[validPath.length - 1] : null;

  useEffect(() => { setZoom(1); }, [drilledId]);

  const level = useMemo(() => (graph && model ? levelOf(graph, model, drilledId) : { nodes: [], edges: [] }), [graph, model, drilledId]);

  const box = useMemo(() => {
    if (!level.nodes.length) return null;
    const xs: number[] = []; const ys: number[] = [];
    for (const n of level.nodes) {
      xs.push(n.x, n.x + n.width); ys.push(n.y, n.y + n.height + (isEvent(n.type) || isGateway(n.type) || /data/i.test(n.type) ? 34 : 0));
      if (n.label) { xs.push(n.label.x, n.label.x + n.label.width); ys.push(n.label.y, n.label.y + n.label.height); }
    }
    for (const e of level.edges) for (const p of e.waypoints ?? []) { xs.push(p.x); ys.push(p.y); }
    const minX = Math.min(...xs) - 40; const minY = Math.min(...ys) - 40;
    const w = Math.max(Math.max(...xs) + 40 - minX, 360); const h = Math.max(Math.max(...ys) + 40 - minY, 220);
    return { minX, minY, w, h };
  }, [level]);

  const crumbs = [{ id: null as string | null, name: 'Process' }, ...validPath.map((id) => ({ id, name: model?.byId.get(id)?.name?.trim() || 'Sub-process' }))];
  const drill = (id: string) => setPath([...validPath, id]);
  const goTo = (id: string | null) => setPath(id === null ? [] : validPath.slice(0, validPath.indexOf(id) + 1));

  const hasContent = Boolean(graph && graph.nodes.length);

  return (
    <div className={`flex min-h-0 flex-col h-[540px] ${heightClass}`}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
        <nav aria-label="Sub-process path" className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px]">
          {crumbs.map((c, i) => (
            <span key={c.id ?? 'root'} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className="text-slate-400" aria-hidden="true">›</span>}
              {i < crumbs.length - 1
                ? <button type="button" onClick={() => goTo(c.id)} className="max-w-[160px] cursor-pointer truncate border-0 bg-transparent p-0 text-accent [font-family:inherit] [font-size:inherit] hover:underline">{c.name}</button>
                : <span className="max-w-[200px] truncate font-medium text-slate-800">{c.name}</span>}
            </span>
          ))}
          {!validPath.length && model && model.collapsed.size > 0 && <span className="ml-2 hidden text-slate-400 sm:inline">Click a sub-process to open it</span>}
        </nav>
        <div className="flex items-center gap-0.5" role="group" aria-label="Zoom">
          <button type="button" className={iconBtn} onClick={() => setZoom((z) => Math.max(0.5, +(z / 1.25).toFixed(3)))} aria-label="Zoom out" title="Zoom out">−</button>
          <span className="w-10 text-center text-[11px] tabular-nums text-slate-500">{Math.round(zoom * 100)}%</span>
          <button type="button" className={iconBtn} onClick={() => setZoom((z) => Math.min(4, +(z * 1.25).toFixed(3)))} aria-label="Zoom in" title="Zoom in">+</button>
          <button type="button" className={`${iconBtn} !w-auto px-2 text-[11px]`} onClick={() => setZoom(1)} title="Fit to view">Fit</button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {!hasContent || !box ? (
          <div className="flex h-full items-center justify-center bg-white text-[13px] text-slate-400">
            {drilledId ? 'This sub-process is empty.' : 'This version has no diagram content.'}
          </div>
        ) : (
          <div className="flex h-full w-full overflow-auto bg-white [background-image:radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:14px_14px]">
            <svg
              viewBox={`${box.minX} ${box.minY} ${box.w} ${box.h}`}
              preserveAspectRatio="xMidYMid meet"
              className="m-auto block shrink-0"
              style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%`, minHeight: 240, maxWidth: zoom <= 1 ? box.w * 1.5 * zoom : undefined, maxHeight: zoom <= 1 ? box.h * 1.5 * zoom : undefined }}
              role="img"
              aria-label="Workflow diagram preview"
            >
              <defs>
                <marker id={`arrow-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill={STROKE} /></marker>
              </defs>

              {/* outlines: pools, lanes, groups, expanded sub-processes */}
              {level.nodes.filter((n) => isOutlineType(n.type) || (isSubType(n.type) && !model!.collapsed.has(n.id))).map((n) => (
                <g key={n.id}>
                  <rect x={n.x} y={n.y} width={n.width} height={n.height} rx={isSubType(n.type) ? 8 : 0} fill={/pool|lane/i.test(n.type) ? '#f8fafc' : 'none'} fillOpacity={0.7} stroke={STROKE} strokeWidth={1.4} strokeDasharray={/group/i.test(n.type) ? '6 4' : undefined} />
                  {n.name && <text x={n.x + 10} y={n.y + 17} fontSize={11} fontWeight={600} className="fill-slate-500">{n.name.slice(0, 44)}</text>}
                </g>
              ))}

              {level.edges.map((e) => {
                let pts = e.waypoints ?? [];
                if (pts.length < 2) {
                  const a = model!.byId.get(e.source); const b = model!.byId.get(e.target);
                  if (!a || !b) return null;
                  pts = [{ x: a.x + a.width / 2, y: a.y + a.height / 2 }, { x: b.x + b.width / 2, y: b.y + b.height / 2 }];
                }
                const dash = /messageFlow/.test(e.type) ? '6 4' : /association/i.test(e.type) ? '2 3' : undefined;
                return <polyline key={e.id} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={STROKE} strokeWidth={1.4} strokeDasharray={dash} markerEnd={/association/i.test(e.type) ? undefined : `url(#arrow-${uid})`} />;
              })}

              {level.nodes.filter((n) => !(isOutlineType(n.type) || (isSubType(n.type) && !model!.collapsed.has(n.id)))).map((n) => {
                const { x, y, width: w, height: h } = n;
                const cx = x + w / 2; const cy = y + h / 2;
                const name = (n.name ?? '').trim();
                const below = (lines: string[]) => lines.map((l, i) => <tspan key={i} x={cx} dy={i === 0 ? 0 : 13}>{l}</tspan>);

                if (model!.collapsed.has(n.id)) {
                  const count = model!.size.get(n.id) ?? 0;
                  const lines = wrap(name || 'Sub-process', Math.max(8, Math.floor((w - 12) / 6.4)), 2);
                  return (
                    <g key={n.id} role="button" tabIndex={0} aria-label={`Open sub-process ${name || 'without a name'}`} className="group cursor-pointer outline-none"
                      onClick={() => drill(n.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(n.id); } }}>
                      <title>{`${name || 'Sub-process'} · ${count} ${count === 1 ? 'element' : 'elements'} · click to open`}</title>
                      <rect x={x} y={y} width={w} height={h} rx={8} strokeWidth={1.6} className="fill-white stroke-slate-500 transition group-hover:fill-blue-50 group-hover:stroke-accent group-focus-visible:stroke-accent" />
                      <text x={cx} y={cy - 8 - (lines.length - 1) * 6} textAnchor="middle" fontSize={12} className="select-none fill-slate-800">{below(lines)}</text>
                      <rect x={cx - 8} y={y + h - 22} width={16} height={16} rx={2} strokeWidth={1.2} className="fill-white stroke-slate-500 group-hover:stroke-accent" />
                      <path d={`M${cx - 4} ${y + h - 14}h8M${cx} ${y + h - 18}v8`} strokeWidth={1.4} fill="none" className="stroke-slate-600 group-hover:stroke-accent" />
                    </g>
                  );
                }

                if (isEvent(n.type)) {
                  const r = Math.min(w, h) / 2;
                  const thick = /end/i.test(n.type) ? 3.2 : 1.6;
                  const double = /intermediate|boundary/i.test(n.type);
                  return (
                    <g key={n.id}>
                      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={STROKE} strokeWidth={thick} />
                      {double && <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke={STROKE} strokeWidth={1.2} />}
                      {name && !/boundary/i.test(n.type) && <text x={cx} y={y + h + 15} textAnchor="middle" fontSize={11} className="select-none fill-slate-700">{below(wrap(name, 20, 2))}</text>}
                    </g>
                  );
                }

                if (isGateway(n.type)) {
                  const k = Math.min(w, h) / 6;
                  return (
                    <g key={n.id}>
                      <polygon points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`} fill="#fff" stroke={STROKE} strokeWidth={1.6} />
                      {/exclusive/i.test(n.type) && <path d={`M${cx - k} ${cy - k}L${cx + k} ${cy + k}M${cx + k} ${cy - k}L${cx - k} ${cy + k}`} stroke={STROKE} strokeWidth={2.4} />}
                      {/parallel/i.test(n.type) && <path d={`M${cx - k * 1.3} ${cy}h${k * 2.6}M${cx} ${cy - k * 1.3}v${k * 2.6}`} stroke={STROKE} strokeWidth={2.4} />}
                      {/inclusive/i.test(n.type) && <circle cx={cx} cy={cy} r={k * 1.4} fill="none" stroke={STROKE} strokeWidth={2.2} />}
                      {name && <text x={cx} y={y + h + 15} textAnchor="middle" fontSize={11} className="select-none fill-slate-700">{below(wrap(name, 20, 2))}</text>}
                    </g>
                  );
                }

                if (/textAnnotation/.test(n.type)) {
                  const lines = wrap(name, Math.max(10, Math.floor((w - 14) / 6)), Math.max(1, Math.floor(h / 14)));
                  return (
                    <g key={n.id}>
                      <path d={`M${x + 10} ${y}H${x}V${y + h}H${x + 10}`} fill="none" stroke={STROKE} strokeWidth={1.2} />
                      <text x={x + 8} y={y + 14} fontSize={11} className="select-none fill-slate-700">{lines.map((l, i) => <tspan key={i} x={x + 8} dy={i === 0 ? 0 : 13}>{l}</tspan>)}</text>
                    </g>
                  );
                }

                if (/data/i.test(n.type)) {
                  return (
                    <g key={n.id}>
                      <path d={`M${x} ${y}H${x + w - 10}L${x + w} ${y + 10}V${y + h}H${x}Z`} fill="#fff" stroke={STROKE} strokeWidth={1.3} />
                      {name && <text x={cx} y={y + h + 15} textAnchor="middle" fontSize={11} className="select-none fill-slate-700">{below(wrap(name, 20, 2))}</text>}
                    </g>
                  );
                }

                // tasks and call activities
                const lines = wrap(name || typeName(n.type), Math.max(8, Math.floor((w - 14) / 6.4)), 3);
                return (
                  <g key={n.id}>
                    <rect x={x} y={y} width={w} height={h} rx={8} fill="#fff" stroke={STROKE} strokeWidth={1.6} />
                    <text x={cx} y={cy + 4 - (lines.length - 1) * 6.5} textAnchor="middle" fontSize={12} className="select-none fill-slate-800">{below(lines)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
