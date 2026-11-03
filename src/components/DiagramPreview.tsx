import { useEffect, useId, useMemo, useState } from 'react';
import type { WorkflowGraph } from '../workflow/io/graph';
import { buildModel, computeViewBox, levelOf } from './preview/previewModel';
import { EdgeLine, OutlineShape, PreviewNode, STROKE, isDrawnAsOutline } from './preview/PreviewShapes';

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

const ICON_BUTTON =
  'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-[15px] leading-none text-slate-600 [font-family:inherit] transition hover:bg-slate-200/70 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

interface DiagramPreviewProps {
  graph: WorkflowGraph | null;
  heightClass?: string;
}

export default function DiagramPreview({
  graph,
  heightClass = 'h-[min(56vh,560px)] min-h-[300px]',
}: DiagramPreviewProps) {
  const arrowId = `arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [path, setPath] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);

  const model = useMemo(() => (graph ? buildModel(graph) : null), [graph]);

  const openPath = useMemo(() => {
    if (!model) return [];
    const result: string[] = [];
    for (const id of path) {
      if (!model.collapsed.has(id)) break;
      result.push(id);
    }
    return result;
  }, [path, model]);
  const drilledId = openPath.length ? openPath[openPath.length - 1] : null;

  useEffect(() => setZoom(1), [drilledId]);

  const level = useMemo(
    () => (graph && model ? levelOf(graph, model, drilledId) : { nodes: [], edges: [] }),
    [graph, model, drilledId],
  );
  const viewBox = useMemo(() => computeViewBox(level.nodes, level.edges), [level]);

  const crumbs = [
    { id: null as string | null, name: 'Process' },
    ...openPath.map((id) => ({ id, name: model?.byId.get(id)?.name?.trim() || 'Sub-process' })),
  ];
  const drillInto = (id: string) => setPath([...openPath, id]);
  const goTo = (id: string | null) => setPath(id === null ? [] : openPath.slice(0, openPath.indexOf(id) + 1));
  const changeZoom = (factor: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z * factor).toFixed(3))));

  const hasContent = Boolean(graph && graph.nodes.length);
  const showHint = !openPath.length && model && model.collapsed.size > 0;

  return (
    <div className={`flex min-h-0 flex-col ${heightClass}`}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
        <nav aria-label="Sub-process path" className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px]">
          {crumbs.map((crumb, index) => (
            <span key={crumb.id ?? 'root'} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <span className="text-slate-400" aria-hidden="true">
                  ›
                </span>
              )}
              {index < crumbs.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(crumb.id)}
                  className="max-w-[160px] cursor-pointer truncate border-0 bg-transparent p-0 text-accent [font-family:inherit] [font-size:inherit] hover:underline"
                >
                  {crumb.name}
                </button>
              ) : (
                <span className="max-w-[200px] truncate font-medium text-slate-800">{crumb.name}</span>
              )}
            </span>
          ))}
          {showHint && (
            <span className="ml-2 hidden text-slate-400 sm:inline">Click a sub-process to open it</span>
          )}
        </nav>
        <div className="flex items-center gap-0.5" role="group" aria-label="Zoom">
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => changeZoom(1 / ZOOM_STEP)}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
          <span className="w-10 text-center text-[11px] tabular-nums text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => changeZoom(ZOOM_STEP)}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className={`${ICON_BUTTON} !w-auto px-2 text-[11px]`}
            onClick={() => setZoom(1)}
            title="Fit to view"
          >
            Fit
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {!hasContent || !viewBox || !model ? (
          <div className="flex h-full items-center justify-center bg-white text-[13px] text-slate-400">
            {drilledId ? 'This sub-process is empty.' : 'This version has no diagram content.'}
          </div>
        ) : (
          <div className="flex h-full w-full overflow-auto bg-white [background-image:radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:14px_14px]">
            <svg
              viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.w} ${viewBox.h}`}
              preserveAspectRatio="xMidYMid meet"
              className="m-auto block shrink-0"
              style={{
                width: `${zoom * 100}%`,
                height: `${zoom * 100}%`,
                minHeight: 240,
                maxWidth: zoom <= 1 ? viewBox.w * 1.5 * zoom : undefined,
                maxHeight: zoom <= 1 ? viewBox.h * 1.5 * zoom : undefined,
              }}
              role="img"
              aria-label="Workflow diagram preview"
            >
              <defs>
                <marker
                  id={arrowId}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 10 5 0 10z" fill={STROKE} />
                </marker>
              </defs>

              {level.nodes
                .filter((n) => isDrawnAsOutline(n, model))
                .map((n) => (
                  <OutlineShape key={n.id} node={n} />
                ))}
              {level.edges.map((e) => (
                <EdgeLine key={e.id} edge={e} model={model} arrowId={arrowId} />
              ))}
              {level.nodes
                .filter((n) => !isDrawnAsOutline(n, model))
                .map((n) => (
                  <PreviewNode key={n.id} node={n} model={model} onDrill={drillInto} />
                ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
