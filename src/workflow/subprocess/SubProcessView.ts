import { isCollapsedSub, isSubProcessLike } from '../pool/poolUtils';
import { isWorkflowElement } from '../types';
import { plusMarkerBox } from '../CustomRenderer';

const ROOT_KEY = '__root__';
const isBoundary = (el: any) => el?.type === 'workflow:boundaryEvent';

export interface DrillCrumb {
  id: string | null;
  name: string;
}

export default class SubProcessView {
  static $inject = [
    'eventBus',
    'elementRegistry',
    'graphicsFactory',
    'canvas',
    'overlays',
    'selection',
    'modeling',
  ];

  private drilled: any = null;
  private viewboxes = new Map<string, any>();
  private overlays_ = new Map<string, { overlayId: string; shape: any }>();
  private scheduled = false;

  constructor(
    private eventBus: any,
    private registry: any,
    private graphics: any,
    private canvas: any,
    private overlays: any,
    private selection: any,
    private modeling: any,
  ) {
    eventBus.on('commandStack.changed', () => this.schedule());
    eventBus.on('elements.changed', () => this.schedule());

    canvas.getContainer().addEventListener('click', (e: MouseEvent) => this.onMarkerClick(e));
  }

  private onMarkerClick(e: MouseEvent): void {
    if (e.detail > 1) return;
    const gfx = (e.target as Element | null)?.closest?.('.djs-element');
    const shape = gfx && this.registry.get(gfx.getAttribute('data-element-id'));
    const box = shape && isCollapsedSub(shape) ? plusMarkerBox(shape) : null;
    if (!shape || !box) return;
    const visual = gfx!.querySelector(':scope > .djs-visual') as Element | null;
    const r = visual?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return;
    const x = ((e.clientX - r.left) / r.width) * shape.width;
    const y = ((e.clientY - r.top) / r.height) * shape.height;
    if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height)
      this.modeling.toggleSubProcess(shape);
  }

  getDrilled(): any {
    return this.drilled;
  }

  path(): DrillCrumb[] {
    const chain: any[] = [];
    for (let a = this.drilled; a; a = a.parent) if (isCollapsedSub(a)) chain.unshift(a);
    return [
      { id: null, name: 'Process' },
      ...chain.map((a) => ({ id: a.id, name: (a.businessObject?.name || '').trim() || 'Sub-process' })),
    ];
  }

  drillInto(shape: any): void {
    if (!isCollapsedSub(shape) || shape === this.drilled) return;
    this.enter(shape);
  }

  drillOut(): void {
    if (this.drilled) this.enter(null);
  }

  goTo(id: string | null): void {
    if (id === null) return this.drillOut();
    const shape = this.registry.get(id);
    if (shape) this.drillInto(shape);
  }

  reset(): void {
    const had = !!this.drilled;
    this.drilled = null;
    this.viewboxes.clear();
    if (had) this.eventBus.fire('workflow.drill.changed', { drilled: null, path: this.path() });
  }

  private enter(next: any | null): void {
    this.viewboxes.set(this.drilled?.id ?? ROOT_KEY, this.canvas.viewbox());
    this.drilled = next;
    this.selection.select([]);
    this.sync();
    const saved = this.viewboxes.get(next?.id ?? ROOT_KEY);
    if (saved) this.canvas.viewbox(saved);
    else this.fit(next);
    this.eventBus.fire('workflow.drill.changed', { drilled: next, path: this.path() });
  }

  private fit(shape: any | null): void {
    const visible = this.registry.filter(
      (el: any) => !el.hidden && !el.waypoints && !el.labelTarget && isWorkflowElement(el),
    );
    if (visible.length) {
      this.canvas.zoom('fit-viewport', 'auto');
      return;
    }

    const { x, y } = shape || { x: 0, y: 0 };
    this.canvas.viewbox({ x: x - 150, y: y - 100, width: 600, height: 400 });
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.sync();
    });
  }

  private isInside(container: any, el: any): boolean {
    for (let p = el.parent; p; p = p.parent) if (p === container) return true;
    return false;
  }

  private shapeHidden(el: any): boolean {
    const d = this.drilled;
    if (d && el === d) return true;
    if (isBoundary(el) && el.parent) return d && el.parent === d ? true : this.shapeHidden(el.parent);
    if (d && !this.isInside(d, el)) return true;
    for (let a = el.parent; a && a !== d; a = a.parent) if (isCollapsedSub(a)) return true;
    return false;
  }

  private computeHidden(el: any, memo: Map<any, boolean>): boolean {
    const cached = memo.get(el);
    if (cached !== undefined) return cached;
    let hidden: boolean;
    if (el.labelTarget) hidden = this.computeHidden(el.labelTarget, memo);
    else if (el.waypoints) {
      hidden =
        (el.source ? this.computeHidden(el.source, memo) : false) ||
        (el.target ? this.computeHidden(el.target, memo) : false) ||
        (this.drilled
          ? !!el.parent && el.parent !== this.drilled && !this.isInside(this.drilled, el)
          : false);
    } else hidden = this.shapeHidden(el);
    memo.set(el, hidden);
    return hidden;
  }

  sync(): void {
    if (this.drilled && (!this.registry.get(this.drilled.id) || !isCollapsedSub(this.drilled))) {
      this.drilled = null;
      this.eventBus.fire('workflow.drill.changed', { drilled: null, path: this.path() });
      const saved = this.viewboxes.get(ROOT_KEY);
      if (saved) this.canvas.viewbox(saved);
    }

    const memo = new Map<any, boolean>();
    const changed: any[] = [];
    this.registry.forEach((el: any) => {
      if (!el.parent || (!isWorkflowElement(el) && !el.labelTarget)) return;
      const hidden = this.computeHidden(el, memo);
      if (!!el.hidden !== hidden) {
        el.hidden = hidden;
        changed.push(el);
      }
    });
    for (const el of changed) {
      const gfx = this.registry.getGraphics(el);
      if (gfx) this.graphics.update(el.waypoints ? 'connection' : 'shape', el, gfx);
    }
    this.syncOverlays();
  }

  private syncOverlays(): void {
    const wanted = new Set<string>();
    this.registry.forEach((el: any) => {
      if (isSubProcessLike(el) && isCollapsedSub(el) && !el.hidden) wanted.add(el.id);
    });

    for (const [id, entry] of [...this.overlays_]) {
      if (!wanted.has(id) || this.registry.get(id) !== entry.shape) {
        try {
          this.overlays.remove(entry.overlayId);
        } catch {}
        this.overlays_.delete(id);
      }
    }
    for (const id of wanted) {
      if (this.overlays_.has(id)) continue;
      const shape = this.registry.get(id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'workflow-drilldown';
      button.title = 'Open sub-process';
      button.setAttribute('aria-label', 'Open sub-process');
      button.innerHTML =
        '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 3h7v7M13 3 5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.drillInto(this.registry.get(id) || shape);
      });
      button.addEventListener('mousedown', (e) => e.stopPropagation());
      this.overlays_.set(id, {
        shape,
        overlayId: this.overlays.add(shape, 'workflow-drilldown', {
          position: { top: 3, left: Math.max(3, shape.width - 23) },
          html: button,
          scale: false,
        }),
      });
    }
  }
}
