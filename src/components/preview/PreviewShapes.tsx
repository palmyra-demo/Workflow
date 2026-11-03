import type { GraphEdge, GraphNode } from '../../workflow/io/graph';
import { Model, isEvent, isGateway, isOutlineType, isSubType, typeName, wrap } from './previewModel';

export const STROKE = '#64748b';

const LABEL_CLASS = 'select-none fill-slate-700';

const centeredLines = (lines: string[], cx: number) =>
  lines.map((line, i) => (
    <tspan key={i} x={cx} dy={i === 0 ? 0 : 13}>
      {line}
    </tspan>
  ));

function LabelBelow({ node, name }: { node: GraphNode; name: string }) {
  if (!name) return null;
  const cx = node.x + node.width / 2;
  return (
    <text x={cx} y={node.y + node.height + 15} textAnchor="middle" fontSize={11} className={LABEL_CLASS}>
      {centeredLines(wrap(name, 20, 2), cx)}
    </text>
  );
}

export const isDrawnAsOutline = (node: GraphNode, model: Model) =>
  isOutlineType(node.type) || (isSubType(node.type) && !model.collapsed.has(node.id));

export function OutlineShape({ node }: { node: GraphNode }) {
  const { x, y, width, height, type, name } = node;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={isSubType(type) ? 8 : 0}
        fill={/pool|lane/i.test(type) ? '#f8fafc' : 'none'}
        fillOpacity={0.7}
        stroke={STROKE}
        strokeWidth={1.4}
        strokeDasharray={/group/i.test(type) ? '6 4' : undefined}
      />
      {name && (
        <text x={x + 10} y={y + 17} fontSize={11} fontWeight={600} className="fill-slate-500">
          {name.slice(0, 44)}
        </text>
      )}
    </g>
  );
}

export function EdgeLine({ edge, model, arrowId }: { edge: GraphEdge; model: Model; arrowId: string }) {
  let points = edge.waypoints ?? [];
  if (points.length < 2) {
    const source = model.byId.get(edge.source);
    const target = model.byId.get(edge.target);
    if (!source || !target) return null;
    points = [
      { x: source.x + source.width / 2, y: source.y + source.height / 2 },
      { x: target.x + target.width / 2, y: target.y + target.height / 2 },
    ];
  }

  const isAssociation = /association/i.test(edge.type);
  const dash = /messageFlow/.test(edge.type) ? '6 4' : isAssociation ? '2 3' : undefined;

  return (
    <polyline
      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
      fill="none"
      stroke={STROKE}
      strokeWidth={1.4}
      strokeDasharray={dash}
      markerEnd={isAssociation ? undefined : `url(#${arrowId})`}
    />
  );
}

interface CollapsedProps {
  node: GraphNode;
  childCount: number;
  onOpen: () => void;
}

function CollapsedSubProcess({ node, childCount, onOpen }: CollapsedProps) {
  const { x, y, width: w, height: h } = node;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const name = (node.name ?? '').trim();
  const lines = wrap(name || 'Sub-process', Math.max(8, Math.floor((w - 12) / 6.4)), 2);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Open sub-process ${name || 'without a name'}`}
      className="group cursor-pointer outline-none"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <title>{`${name || 'Sub-process'} · ${childCount} ${childCount === 1 ? 'element' : 'elements'} · click to open`}</title>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        strokeWidth={1.6}
        className="fill-white stroke-slate-500 transition group-hover:fill-blue-50 group-hover:stroke-accent group-focus-visible:stroke-accent"
      />
      <text
        x={cx}
        y={cy - 8 - (lines.length - 1) * 6}
        textAnchor="middle"
        fontSize={12}
        className="select-none fill-slate-800"
      >
        {centeredLines(lines, cx)}
      </text>
      <rect
        x={cx - 8}
        y={y + h - 22}
        width={16}
        height={16}
        rx={2}
        strokeWidth={1.2}
        className="fill-white stroke-slate-500 group-hover:stroke-accent"
      />
      <path
        d={`M${cx - 4} ${y + h - 14}h8M${cx} ${y + h - 18}v8`}
        strokeWidth={1.4}
        fill="none"
        className="stroke-slate-600 group-hover:stroke-accent"
      />
    </g>
  );
}

function EventShape({ node, name }: { node: GraphNode; name: string }) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const radius = Math.min(node.width, node.height) / 2;
  const isBoundary = /boundary/i.test(node.type);
  const hasInnerRing = /intermediate|boundary/i.test(node.type);

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="#fff"
        stroke={STROKE}
        strokeWidth={/end/i.test(node.type) ? 3.2 : 1.6}
      />
      {hasInnerRing && (
        <circle cx={cx} cy={cy} r={radius - 4} fill="none" stroke={STROKE} strokeWidth={1.2} />
      )}
      {!isBoundary && <LabelBelow node={node} name={name} />}
    </g>
  );
}

function GatewayShape({ node, name }: { node: GraphNode; name: string }) {
  const { x, y, width: w, height: h, type } = node;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const k = Math.min(w, h) / 6;

  return (
    <g>
      <polygon
        points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`}
        fill="#fff"
        stroke={STROKE}
        strokeWidth={1.6}
      />
      {/exclusive/i.test(type) && (
        <path
          d={`M${cx - k} ${cy - k}L${cx + k} ${cy + k}M${cx + k} ${cy - k}L${cx - k} ${cy + k}`}
          stroke={STROKE}
          strokeWidth={2.4}
        />
      )}
      {/parallel/i.test(type) && (
        <path
          d={`M${cx - k * 1.3} ${cy}h${k * 2.6}M${cx} ${cy - k * 1.3}v${k * 2.6}`}
          stroke={STROKE}
          strokeWidth={2.4}
        />
      )}
      {/inclusive/i.test(type) && (
        <circle cx={cx} cy={cy} r={k * 1.4} fill="none" stroke={STROKE} strokeWidth={2.2} />
      )}
      <LabelBelow node={node} name={name} />
    </g>
  );
}

function TextAnnotationShape({ node, name }: { node: GraphNode; name: string }) {
  const { x, y, width: w, height: h } = node;
  const lines = wrap(name, Math.max(10, Math.floor((w - 14) / 6)), Math.max(1, Math.floor(h / 14)));

  return (
    <g>
      <path d={`M${x + 10} ${y}H${x}V${y + h}H${x + 10}`} fill="none" stroke={STROKE} strokeWidth={1.2} />
      <text x={x + 8} y={y + 14} fontSize={11} className={LABEL_CLASS}>
        {lines.map((line, i) => (
          <tspan key={i} x={x + 8} dy={i === 0 ? 0 : 13}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function DataShape({ node, name }: { node: GraphNode; name: string }) {
  const { x, y, width: w, height: h } = node;
  return (
    <g>
      <path
        d={`M${x} ${y}H${x + w - 10}L${x + w} ${y + 10}V${y + h}H${x}Z`}
        fill="#fff"
        stroke={STROKE}
        strokeWidth={1.3}
      />
      <LabelBelow node={node} name={name} />
    </g>
  );
}

function TaskShape({ node, name }: { node: GraphNode; name: string }) {
  const { x, y, width: w, height: h } = node;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const lines = wrap(name || typeName(node.type), Math.max(8, Math.floor((w - 14) / 6.4)), 3);

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#fff" stroke={STROKE} strokeWidth={1.6} />
      <text
        x={cx}
        y={cy + 4 - (lines.length - 1) * 6.5}
        textAnchor="middle"
        fontSize={12}
        className="select-none fill-slate-800"
      >
        {centeredLines(lines, cx)}
      </text>
    </g>
  );
}

interface PreviewNodeProps {
  node: GraphNode;
  model: Model;
  onDrill: (id: string) => void;
}

export function PreviewNode({ node, model, onDrill }: PreviewNodeProps) {
  const name = (node.name ?? '').trim();

  if (model.collapsed.has(node.id)) {
    return (
      <CollapsedSubProcess
        node={node}
        childCount={model.size.get(node.id) ?? 0}
        onOpen={() => onDrill(node.id)}
      />
    );
  }
  if (isEvent(node.type)) return <EventShape node={node} name={name} />;
  if (isGateway(node.type)) return <GatewayShape node={node} name={name} />;
  if (/textAnnotation/.test(node.type)) return <TextAnnotationShape node={node} name={name} />;
  if (/data/i.test(node.type)) return <DataShape node={node} name={name} />;
  return <TaskShape node={node} name={name} />;
}
