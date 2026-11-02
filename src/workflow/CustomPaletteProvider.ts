import { paletteConfig, PaletteShapeConfig, BpmnShapeType } from './paletteConfig';
import { WorkflowType } from './types';

const BPMN_TO_WORKFLOW: Record<BpmnShapeType, WorkflowType> = {
  'bpmn:StartEvent': 'workflow:startEvent',
  'bpmn:StartEvent:Timer': 'workflow:startEvent',
  'bpmn:StartEvent:Message': 'workflow:startEvent',
  'bpmn:StartEvent:Signal': 'workflow:startEvent',
  'bpmn:EndEvent': 'workflow:endEvent',
  'bpmn:EndEvent:Terminate': 'workflow:endEvent',
  'bpmn:EndEvent:Message': 'workflow:endEvent',
  'bpmn:IntermediateCatchEvent': 'workflow:intermediateEvent',
  'bpmn:IntermediateCatchEvent:Timer': 'workflow:timerIntermediateEvent',
  'bpmn:IntermediateCatchEvent:Message': 'workflow:messageIntermediateEvent',
  'bpmn:IntermediateThrowEvent': 'workflow:intermediateEvent',
  'bpmn:BoundaryEvent': 'workflow:boundaryEvent',
  'bpmn:Task': 'workflow:task',
  'bpmn:UserTask': 'workflow:userTask',
  'bpmn:ServiceTask': 'workflow:serviceTask',
  'bpmn:ManualTask': 'workflow:manualTask',
  'bpmn:ScriptTask': 'workflow:scriptTask',
  'bpmn:BusinessRuleTask': 'workflow:businessRuleTask',
  'bpmn:SendTask': 'workflow:sendTask',
  'bpmn:ReceiveTask': 'workflow:receiveTask',
  'bpmn:SubProcess': 'workflow:subProcess',
  'bpmn:CallActivity': 'workflow:callActivity',
  'bpmn:ExclusiveGateway': 'workflow:exclusiveGateway',
  'bpmn:ParallelGateway': 'workflow:parallelGateway',
  'bpmn:InclusiveGateway': 'workflow:inclusiveGateway',
  'bpmn:EventBasedGateway': 'workflow:eventBasedGateway',
  'bpmn:ComplexGateway': 'workflow:complexGateway',
  'bpmn:DataObjectReference': 'workflow:dataObject',
  'bpmn:DataStoreReference': 'workflow:dataStore',
  'bpmn:Pool': 'workflow:pool',
  'bpmn:Lane': 'workflow:lane',
  'bpmn:Participant': 'workflow:pool',
  'bpmn:TimerEvent': 'workflow-timerEvent'
};

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
  hand: svg('<path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>'),
  lasso: svg('<rect x="3" y="4" width="14" height="12" rx="1.5" stroke-dasharray="3 2.4"/><path d="m13 13 7 3-3 1.5L15.5 21z" fill="currentColor"/>'),
  space: svg('<path d="M12 4v16"/><path d="M3 12h6M6 9l-3 3 3 3"/><path d="M21 12h-6M18 9l3 3-3 3"/>'),
  connect: svg('<circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><path d="m7.4 16.6 9.2-9.2"/>'),
  startEvent: svg('<circle cx="12" cy="12" r="8"/>'),
  intermediateEvent: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.8"/>'),
  endEvent: svg('<circle cx="12" cy="12" r="7.5" stroke-width="3.4"/>'),
  boundaryEvent: svg('<rect x="3" y="6" width="18" height="13" rx="3"/><circle cx="12" cy="19" r="3.6" fill="#fff"/><circle cx="12" cy="19" r="2.2"/>'),
  gateway: svg('<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><path d="m9 9 6 6M15 9l-6 6"/>'),
  task: svg('<rect x="3" y="6" width="18" height="12" rx="3"/>'),
  subProcess: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><rect x="9.5" y="13" width="5" height="4"/><path d="M12 14v2M11 15h2"/>'),
  dataObject: svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>'),
  dataStore: svg('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'),
  participant: svg('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M8 5v14"/>'),
  group: svg('<rect x="3" y="5" width="18" height="14" rx="3" stroke-dasharray="4 2.5"/>'),
  more: svg('<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),
};

interface CreateSpec {
  id: string;
  title: string;
  icon: string;
  /** id of the entry in paletteConfig (carries type, size and markers) */
  configId?: string;
  type?: WorkflowType;
}

const CREATE_ENTRIES: Array<CreateSpec | 'separator'> = [
  { id: 'create.start-event', title: 'Create start event', icon: ICONS.startEvent, configId: 'create-start-event' },
  { id: 'create.intermediate-event', title: 'Create intermediate/boundary event', icon: ICONS.intermediateEvent, configId: 'create-intermediate-catch' },
  { id: 'create.end-event', title: 'Create end event', icon: ICONS.endEvent, configId: 'create-end-event' },
  { id: 'create.boundary-event', title: 'Create boundary event (drop it onto a task)', icon: ICONS.boundaryEvent, configId: 'create-boundary-event' },
  { id: 'create.exclusive-gateway', title: 'Create gateway', icon: ICONS.gateway, configId: 'create-exclusive-gateway' },
  { id: 'create.task', title: 'Create task', icon: ICONS.task, configId: 'create-task' },
  { id: 'create.subprocess', title: 'Create sub-process', icon: ICONS.subProcess, configId: 'create-subprocess' },
  { id: 'create.data-object', title: 'Create data object reference', icon: ICONS.dataObject, configId: 'create-data-object' },
  { id: 'create.data-store', title: 'Create data store reference', icon: ICONS.dataStore, configId: 'create-data-store' },
  'separator',
  { id: 'create.participant', title: 'Create pool/participant', icon: ICONS.participant, configId: 'create-pool' },
  { id: 'create.group', title: 'Create group', icon: ICONS.group, type: 'workflow:group' },
];

export default class CustomPaletteProvider {
  static $inject = [
    'palette',
    'create',
    'elementFactory',
    'lassoTool',
    'spaceTool',
    'handTool',
    'selection',
    'connect',
    'canvas',
    'modeling',
  ];

  private readonly newProperty = 'Create element — browse all BPMN events, tasks, gateways and other elements';

  constructor(
    palette: any,
    private create: any,
    private elementFactory: any,
    private lassoTool: any,
    private spaceTool: any,
    private handTool: any,
    // private selection: any,
    private connect: any,
    private canvas: any,
    private modeling: any,
  ) {
    palette.registerProvider(this);
    window.addEventListener('workflow:open-element-browser', this.openBrowserFromContextPad as EventListener);
  }

  getPaletteEntries(): Record<string, any> {
    const entries: Record<string, any> = {};
    const entriesPoint: Record<string, any> = {};

    const activeTool = (id: string, title: string, icon: string, click: (e: Event) => void) => {
      entriesPoint[id] = {
        group: 'activeTools',
        title,
        html: `<div class="active-tools-entry tools-entry active-tools workflow-element-browser" onClick=${click}>${icon}</div>`
      }
    }

    activeTool('create-more-elements', this.newProperty, ICONS.more, (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleElementBrowser();
    });


    const tool = (id: string, title: string, icon: string, click: (event: Event) => void) => {
      entries[id] = {
        group: 'tools',
        title,
        html: `<div class="entry" data-action="${id}" draggable="false" title="${escapeHtml(title)}">${icon}</div>`,
        action: { click },
      };
    };
    tool('hand-tool', 'Activate hand tool', ICONS.hand, (e) => this.handTool.activateHand(e));
    tool('lasso-tool', 'Activate lasso tool', ICONS.lasso, (e) => this.lassoTool.activateSelection(e));
    tool('space-tool', 'Activate create/remove space tool', ICONS.space, (e) => this.spaceTool.activateSelection(e));
    tool('global-connect-tool', 'Activate global connect tool', ICONS.connect, () => this.connect.start());

    let separators = 0;
    for (const spec of CREATE_ENTRIES) {
      if (spec === 'separator') {
        entries[`separator-${separators++}`] = { group: 'model', separator: true };
        continue;
      }
      const start = (event: Event) => this.createShape(event, spec);
      entries[spec.id] = {
        group: 'model',
        title: spec.title,
        html: `<div class="entry" draggable="true" title="${escapeHtml(spec.title)}">${spec.icon}</div>`,
        action: { dragstart: start, click: start },
      };
    }
    entries['separator-tools'] = { group: 'tools', separator: true };

    tool('create-more-elements', this.newProperty, ICONS.more, (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleElementBrowser();
    });

    return entries;
  }

  private elementBrowser: HTMLDivElement | null = null;

  private openBrowserFromContextPad = (event: Event) => {
    const anchor = (event as CustomEvent<{ anchor?: HTMLElement }>).detail?.anchor;
    this.toggleElementBrowser(anchor || null);
  };
  private elementBrowserOutsideHandler: ((event: MouseEvent) => void) | null = null;

  private closeElementBrowser() {
    this.elementBrowser?.remove();
    this.elementBrowser = null;
    if (this.elementBrowserOutsideHandler) document.removeEventListener('pointerdown', this.elementBrowserOutsideHandler, true);
    this.elementBrowserOutsideHandler = null;
  }

  private toggleElementBrowser(anchor: HTMLElement | null = null) {
    if (this.elementBrowser) {
      this.closeElementBrowser();
      return;
    }
    const panel = document.createElement('div');
    panel.className = 'workflow-element-browser';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Create element');
    panel.innerHTML = `<div class="workflow-element-browser__header"><div><strong>Create element</strong></div><button type="button" class="workflow-element-browser__close" aria-label="Close">×</button></div><div class="workflow-element-browser__search"><input type="search" placeholder="Search events, gateways, tasks…" aria-label="Search elements" /></div><div class="workflow-element-browser__body"></div>`;
    document.body.appendChild(panel);
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(310, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right + 8, window.innerWidth - width - 12));
      const top = Math.max(12, Math.min(rect.top, window.innerHeight - 580));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    }
    this.elementBrowser = panel;

    const palette = panel.querySelector('.workflow-element-browser__body') as HTMLDivElement;
    const search = panel.querySelector('input') as HTMLInputElement;
    const render = () => {
      const query = search.value.trim().toLowerCase();
      palette.innerHTML = '';
      for (const group of paletteConfig) {
        const shapes = group.shapes.filter((shape) => !query || `${shape.title} ${shape.type} ${group.label}`.toLowerCase().includes(query));
        if (!shapes.length) continue;
        const section = document.createElement('section');
        section.className = 'workflow-element-browser__group';
        const heading = document.createElement('div');
        heading.className = 'workflow-element-browser__group-title';
        heading.textContent = group.label;
        section.appendChild(heading);
        const grid = document.createElement('div');
        grid.className = 'workflow-element-browser__grid';
        for (const shape of shapes) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'workflow-element-browser__item';
          button.title = shape.title;
          button.innerHTML = `<span class="workflow-element-browser__icon">${this.iconFor(shape)}</span><span>${escapeHtml(shape.title)}</span>`;
          button.addEventListener('click', () => {
            this.addConfiguredShape(shape);
            this.closeElementBrowser();
          });
          grid.appendChild(button);
        }
        section.appendChild(grid);
        palette.appendChild(section);
      }
      if (!palette.childElementCount) palette.innerHTML = '<div class="workflow-element-browser__empty">No matching elements found.</div>';
    };
    search.addEventListener('input', render);
    panel.querySelector('.workflow-element-browser__close')?.addEventListener('click', () => {
      this.closeElementBrowser();
    });
    const outside = (event: MouseEvent) => {
      if (!panel.contains(event.target as Node) && !(event.target as Element)?.closest?.('[data-action="create-more-elements"]')) {
        this.closeElementBrowser();
      }
    };
    this.elementBrowserOutsideHandler = outside;
    document.addEventListener('pointerdown', outside, true);
    render();
    search.focus();
  }

  private iconFor(config: PaletteShapeConfig): string {
    if (config.type.includes('Gateway')) return ICONS.gateway;
    if (config.type.includes('Event')) {
      if (config.type.includes('StartEvent')) return ICONS.startEvent;
      if (config.type.includes('EndEvent')) return ICONS.endEvent;
      return ICONS.intermediateEvent;
    }
    if (config.type.includes('DataObject')) return ICONS.dataObject;
    if (config.type.includes('DataStore')) return ICONS.dataStore;
    if (config.type === 'bpmn:Pool' || config.type === 'bpmn:Participant' || config.type === 'bpmn:Lane') return ICONS.participant;
    if (config.type === 'bpmn:SubProcess' || config.type === 'bpmn:CallActivity') return ICONS.subProcess;
    return ICONS.task;
  }

  private addConfiguredShape(config: PaletteShapeConfig) {
    const workflowType = BPMN_TO_WORKFLOW[config.type];
    const shape = this.elementFactory.createWorkflowShape(workflowType, {
      width: config.width,
      height: config.height,
      eventMarker: config.eventMarker,
      taskMarker: config.taskMarker,
      gatewaySymbol: config.gatewaySymbol,
      businessObject: {
        type: workflowType,
        bpmnType: config.type,
        eventType: config.eventMarker,
        taskType: config.taskMarker,
        gatewayType: config.gatewaySymbol,
        palmyra: {},
      },
    });
    const viewbox = this.canvas.viewbox();
    const position = {
      x: viewbox.x + viewbox.width / 2,
      y: viewbox.y + viewbox.height / 2,
    };
    this.modeling.createShape(shape, position, this.canvas.getRootElement());
  }

  private createShape(event: Event, spec: CreateSpec) {
    if (!spec.configId) {
      const shape = this.elementFactory.createWorkflowShape(spec.type!);
      this.create.start(event, shape);
      return;
    }
    const config = paletteConfig.flatMap((g) => g.shapes).find((s) => s.id === spec.configId);
    if (!config) return;
    const workflowType = BPMN_TO_WORKFLOW[config.type];
    const shape = this.elementFactory.createWorkflowShape(workflowType, {
      width: config.width,
      height: config.height,
      eventMarker: config.eventMarker,
      taskMarker: config.taskMarker,
      gatewaySymbol: config.gatewaySymbol,
      businessObject: {
        type: workflowType,
        bpmnType: config.type,
        eventType: config.eventMarker,
        taskType: config.taskMarker,
        gatewayType: config.gatewaySymbol,
        palmyra: {},
      },
    });
    this.create.start(event, shape);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
