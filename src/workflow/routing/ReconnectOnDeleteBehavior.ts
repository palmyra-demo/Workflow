import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

const SEQUENCE_FLOW = 'workflow:sequenceFlow';
const isSequenceFlow = (c: any) => c?.type === SEQUENCE_FLOW;

type Bridge = { inFlow: any; outFlow: any };

export default class ReconnectOnDeleteBehavior extends (CommandInterceptor as any) {
  static $inject = ['eventBus', 'modeling', 'rules'];

  constructor(
    eventBus: any,
    private modeling: any,
    private rules: any,
  ) {
    super(eventBus);

    this.preExecute('elements.delete', 2000, (e: any) => this.bridge(e.context.elements || []));
  }

  private bridge(elements: any[]): void {
    const doomed = new Set<any>();
    const collect = (el: any) => {
      if (!el || doomed.has(el)) return;
      doomed.add(el);
      (el.children || []).forEach(collect);
    };
    elements.forEach(collect);
    const explicit = new Set<any>(elements);

    const bridges = new Map<any, Bridge>();
    for (const el of elements) {
      if (el.waypoints || el.labelTarget) continue;
      const incoming = (el.incoming || []).filter(isSequenceFlow);
      const outgoing = (el.outgoing || []).filter(isSequenceFlow);
      if (incoming.length !== 1 || outgoing.length !== 1) continue;
      if (explicit.has(incoming[0]) || explicit.has(outgoing[0])) continue;
      bridges.set(el, { inFlow: incoming[0], outFlow: outgoing[0] });
    }

    const done = new Set<any>();
    for (const node of bridges.keys()) {
      if (done.has(node)) continue;

      const chain: any[] = [node];
      for (let head = node; ;) {
        const prev = bridges.get(head)!.inFlow.source;
        if (!bridges.has(prev) || chain.includes(prev)) break;
        chain.unshift(prev);
        head = prev;
      }
      for (let tail = node; ;) {
        const next = bridges.get(tail)!.outFlow.target;
        if (!bridges.has(next) || chain.includes(next)) break;
        chain.push(next);
        tail = next;
      }
      chain.forEach((c) => done.add(c));

      const { inFlow } = bridges.get(chain[0])!;
      const { outFlow } = bridges.get(chain[chain.length - 1])!;
      const source = inFlow.source;
      const target = outFlow.target;
      if (!source || !target || source === target || doomed.has(source) || doomed.has(target)) continue;
      if ((source.outgoing || []).some((c: any) => isSequenceFlow(c) && c.target === target)) continue;
      const allowed = this.rules.allowed('connection.create', { source, target });
      if (!allowed || (typeof allowed === 'object' && allowed.type !== SEQUENCE_FLOW)) continue;

      this.connectLike(source, target, inFlow);
    }
  }

  private connectLike(source: any, target: any, template: any): void {
    const bo = template.businessObject || {};
    const connection = this.modeling.connect(source, target, { type: SEQUENCE_FLOW, name: bo.name });
    const extra: Record<string, unknown> = {};
    if (bo.conditionExpression) extra.conditionExpression = bo.conditionExpression;
    if (bo.documentation) extra.documentation = bo.documentation;
    if (bo.customProperties && Object.keys(bo.customProperties).length)
      extra.customProperties = JSON.parse(JSON.stringify(bo.customProperties));
    if (bo.palmyra && Object.keys(bo.palmyra).length) extra.palmyra = JSON.parse(JSON.stringify(bo.palmyra));
    if (Object.keys(extra).length) this.modeling.updateProperties(connection, extra);
  }
}
