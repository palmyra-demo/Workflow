import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import { isRoot } from '../pool/poolUtils';
import type SubProcessView from './SubProcessView';

export default class DrillTargetBehavior extends (CommandInterceptor as any) {
  static $inject = ['eventBus', 'subProcessView'];

  constructor(eventBus: any, view: SubProcessView) {
    super(eventBus);
    this.preExecute('elements.create', 7000, (e: any) => {
      const drilled = view.getDrilled();
      if (drilled && isRoot(e.context.parent)) e.context.parent = drilled;
    });
    this.preExecute('elements.move', 7000, (e: any) => {
      const drilled = view.getDrilled();
      if (drilled && isRoot(e.context.newParent)) e.context.newParent = drilled;
    });
  }
}
